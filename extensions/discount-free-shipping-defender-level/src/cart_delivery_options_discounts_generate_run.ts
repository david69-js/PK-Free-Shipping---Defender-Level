import {
  DeliveryDiscountSelectionStrategy,
  DeliveryInput,
  CartDeliveryOptionsDiscountsGenerateRunResult,
} from "../generated/api";

/**
 * Replicated logic from Ruby Shipping Script:
 * TAG = "tier: Defender"
 * MESSAGE = "VIP Customer Reward"
 * Targets "Standard Shipping" rates and applies 100% discount.
 * 
 * Note: Shopify Shipping Discount functions do not support renaming delivery options via change_name.
 * The message field is used to communicate the discount reward.
 */

const TAG = "tier: Defender";
const MESSAGE = "VIP Customer Reward";
const TARGET_SHIPPING_NAME = "Standard Shipping";

export function cartDeliveryOptionsDiscountsGenerateRun(
  input: DeliveryInput,
): CartDeliveryOptionsDiscountsGenerateRunResult {
  const customer = input.cart.buyerIdentity?.customer;
  
  if (!customer) {
    return { operations: [] };
  }

  // Check if customer has the required tag "tier: Defender"
  const hasTag = customer.hasTags.find(t => t.tag === TAG && t.hasTag === true);
  
  if (!hasTag) {
    return { operations: [] };
  }

  // Iterate through delivery groups and find options that match "Standard Shipping"
  const candidates = input.cart.deliveryGroups.flatMap(deliveryGroup => {
    return deliveryGroup.deliveryOptions
      .filter(option => option.title?.includes(TARGET_SHIPPING_NAME))
      .map(option => ({
        message: MESSAGE,
        targets: [
          {
            deliveryOption: {
              handle: option.handle,
            },
          },
        ],
        value: {
          percentage: {
            value: 100, // 100% discount = Free Shipping
          },
        },
      }));
  });

  if (candidates.length === 0) {
    return { operations: [] };
  }

  return {
    operations: [
      {
        deliveryDiscountsAdd: {
          candidates,
          selectionStrategy: DeliveryDiscountSelectionStrategy.All,
        },
      },
    ],
  };
}