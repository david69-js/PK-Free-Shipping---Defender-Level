import {
  DeliveryDiscountSelectionStrategy,
  DeliveryInput,
  CartDeliveryOptionsDiscountsGenerateRunResult,
} from "../generated/api";

type TierConfig = {
  customerTag: string;
  minimumSubtotal: number;
  shippingDiscountPercent: number;
};

type LoyaltyShippingConfig = {
  tiers: TierConfig[];
};

export function cartDeliveryOptionsDiscountsGenerateRun(
  input: DeliveryInput,
): CartDeliveryOptionsDiscountsGenerateRunResult {
  const firstDeliveryGroup = input.cart.deliveryGroups[0];
  if (!firstDeliveryGroup) {
    return {operations: []};
  }

  const metafield = input.discount.metafield;
  if (!metafield || !metafield.jsonValue) {
    return {operations: []};
  }

  const config = metafield.jsonValue as LoyaltyShippingConfig;
  const tiers = config.tiers ?? [];

  const customer = input.cart.buyerIdentity?.customer;
  const hasTags = customer?.hasTags ?? [];

  // Find the first active VIP tier tag the customer has (any hasTag === true)
  const activeTag = hasTags.find(t => t.hasTag === true);

  if (!activeTag) {
    // Customer is not logged in or has none of the VIP tier tags
    return {operations: []};
  }

  // Look up the discount % for this specific tag from the metafield config.
  // Falls back to 100% (full free shipping) if no tier config is found — matching the Ruby logic.
  const matchingTier = tiers.find(tier => tier.customerTag === activeTag.tag);
  const discountPercent = matchingTier?.shippingDiscountPercent ?? 100;

  if (discountPercent <= 0) {
    return {operations: []};
  }

  return {
    operations: [
      {
        deliveryDiscountsAdd: {
          candidates: [
            {
              message:
                discountPercent === 100
                  ? "VIP Customer Reward"
                  : `${discountPercent}% off shipping`,
              targets: [
                {
                  deliveryGroup: {
                    id: firstDeliveryGroup.id,
                  },
                },
              ],
              value: {
                percentage: {
                  value: discountPercent,
                },
              },
            },
          ],
          selectionStrategy: DeliveryDiscountSelectionStrategy.All,
        },
      },
    ],
  };
}