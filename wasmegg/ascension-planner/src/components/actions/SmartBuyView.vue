<template>
  <div class="space-y-4">
    <QuickBuy
      :preview-items="quickBuyPreview"
      :earnings-summary="quickBuyEarningsSummary"
      :stats="quickBuyStats"
      @buy="$emit('quick-buy', $event)"
      @update:threshold-seconds="$emit('update:quickBuyThresholdSeconds', $event)"
    />

    <SmartBuyCard title="Buy Earnings research">
      <template #icon>
        <img
          :src="iconURL('egginc-extras/icon_research_sale.png', 64)"
          class="w-3.5 h-3.5 object-contain"
          alt="Research Sale"
        />
      </template>
      <template #description>
        Buys all the earnings research that should be bought before the next research sale.
      </template>

      <RoiViewControls
        :delivery-impact-only="deliveryImpactOnly"
        :roi-mode="roiMode"
        @update:delivery-impact-only="$emit('update:deliveryImpactOnly', $event)"
        @update:roi-mode="$emit('update:roiMode', $event)"
      />

      <div class="flex flex-col gap-1.5">
        <button
          class="btn-premium btn-primary w-full text-[10px] disabled:opacity-20"
          :disabled="!canBuyUntilSaleWarning"
          @click="$emit('buy-until-sale-warning')"
        >
          70% Return
        </button>
        <p class="text-[9px] text-slate-500 text-center leading-tight px-0.5">
          For strategic buying early in your build.
        </p>
        <ResearchPurchasePreview :items="saleAwarePreview" empty-text="Nothing to buy right now" />
        <SmartBuyStats
          :purchase-count="saleAwareStats70.purchaseCount"
          :seconds="saleAwareStats70.seconds"
          :gems="saleAwareStats70.gems"
        />
        <RatePreviewDelta
          label="Earnings"
          :before="saleAwareEarningsSummary70.before"
          :after="saleAwareEarningsSummary70.after"
          unit="/hr"
        />
      </div>
    </SmartBuyCard>

    <SmartBuyCard title="Buy Delivery Research">
      <template #icon>
        <img
          :src="iconURL('egginc-extras/icon_research_sale.png', 64)"
          class="w-3.5 h-3.5 object-contain"
          alt="Research Sale"
        />
      </template>
      <template #description>
        Buys earnings and delivery research during the current sale to get max delivery research at max speed.
      </template>
      <button
        class="btn-premium btn-primary w-full text-[10px] disabled:opacity-20"
        :disabled="!canBuyUntilSaleDeadline"
        @click="$emit('buy-until-sale-deadline')"
      >
        Buy Until Sale Ends
      </button>
      <SmartBuyStats
        :purchase-count="saleEndsStats.purchaseCount"
        :seconds="saleEndsStats.seconds"
        :gems="saleEndsStats.gems"
      />
      <ResearchPurchasePreview
        :items="saleEndsEarningsPreview"
        label="100% ROI before end of sale. Maximizes buying speed of delivery research"
        empty-text="None needed"
      />
      <RatePreviewDelta
        label="Earnings"
        :before="saleEndsEarningsSummary.before"
        :after="saleEndsEarningsSummary.after"
        unit="/hr"
      />
      <ResearchPurchasePreview
        :items="saleEndsPreview"
        label="Most efficient delivery research until sale ends"
        empty-text="Nothing to buy right now"
      />
      <RatePreviewDelta
        v-if="saleEndsDeliverySummary"
        label="Delivery Rate"
        :before="saleEndsDeliverySummary.before"
        :after="saleEndsDeliverySummary.after"
        unit="/hr"
      />
    </SmartBuyCard>

    <AutoBuy
      :always-on="autoBuyAlwaysOn"
      @update:always-on="$emit('update:autoBuyAlwaysOn', $event)"
      @update="$emit('auto-buy-update', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { iconURL } from 'lib';
import { type RoiMode } from '@/composables/useResearchViews';
import type { ResearchSummaryItem } from '@/calculations/smartBuyPreview';
import QuickBuy from './QuickBuy.vue';
import AutoBuy from './AutoBuy.vue';
import SmartBuyCard from './SmartBuyCard.vue';
import RoiViewControls from './RoiViewControls.vue';
import ResearchPurchasePreview from './ResearchPurchasePreview.vue';
import RatePreviewDelta from './RatePreviewDelta.vue';
import SmartBuyStats from './SmartBuyStats.vue';

interface RateSummary {
  before: number;
  after: number;
}

interface BuyStats {
  purchaseCount: number;
  seconds: number;
  gems: number;
}

defineProps<{
  autoBuyAlwaysOn: boolean;
  deliveryImpactOnly: boolean;
  roiMode: RoiMode;
  canBuyUntilSaleWarning: boolean;
  canBuyUntilSaleDeadline: boolean;
  quickBuyPreview: ResearchSummaryItem[];
  quickBuyEarningsSummary: RateSummary;
  quickBuyStats: BuyStats;
  saleAwarePreview: ResearchSummaryItem[];
  saleAwareStats70: BuyStats;
  saleEndsPreview: ResearchSummaryItem[];
  saleEndsEarningsPreview: ResearchSummaryItem[];
  saleEndsEarningsSummary: RateSummary;
  saleAwareEarningsSummary70: RateSummary;
  saleEndsDeliverySummary: RateSummary | null;
  saleEndsStats: BuyStats;
}>();

defineEmits<{
  (e: 'update:autoBuyAlwaysOn', value: boolean): void;
  (e: 'quick-buy', thresholdSeconds: number): void;
  (e: 'update:quickBuyThresholdSeconds', value: number): void;
  (e: 'auto-buy-update', state: { threshold: number; alwaysOn: boolean }): void;
  (e: 'update:deliveryImpactOnly', value: boolean): void;
  (e: 'update:roiMode', value: RoiMode): void;
  (e: 'buy-until-sale-warning'): void;
  (e: 'buy-until-sale-deadline'): void;
}>();
</script>
