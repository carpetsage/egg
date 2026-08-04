<template>
  <div class="space-y-4">
    <QuickBuy
      :preview-items="quickBuyPreview"
      :earnings-summary="quickBuyEarningsSummary"
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
        Buys earnings research that will achieve X% ROI before the next research sale starts. Will add waits and events
        for 2x earnings and research sale events. Advances time to the start of the next research sale.
      </template>

      <RoiViewControls
        :delivery-impact-only="deliveryImpactOnly"
        :roi-mode="roiMode"
        @update:delivery-impact-only="$emit('update:deliveryImpactOnly', $event)"
        @update:roi-mode="$emit('update:roiMode', $event)"
      />

      <div class="grid grid-cols-2 gap-2">
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
          <RatePreviewDelta
            label="Earnings"
            :before="saleAwareEarningsSummary70.before"
            :after="saleAwareEarningsSummary70.after"
            unit="/hr"
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <button
            class="btn-premium btn-primary w-full text-[10px] disabled:opacity-20"
            :disabled="!canBuyUntilRoiDeadline"
            @click="$emit('buy-until-roi-deadline')"
          >
            100% Return
          </button>
          <p class="text-[9px] text-slate-500 text-center leading-tight px-0.5">
            For your last earnings research before shifting.
          </p>
          <ResearchPurchasePreview
            :items="saleAwareExcludedAt100Preview"
            label="Excludes vs. 70% Return"
            empty-text="Same as 70% Return"
          />
          <RatePreviewDelta
            label="Earnings"
            :before="saleAwareEarningsSummary100.before"
            :after="saleAwareEarningsSummary100.after"
            unit="/hr"
          />
        </div>
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
        Buys delivery research during a research sale, the most efficient way possible, until the research sale ends.
      </template>
      <button
        class="btn-premium btn-primary w-full text-[10px] disabled:opacity-20"
        :disabled="!canBuyUntilSaleDeadline"
        @click="$emit('buy-until-sale-deadline')"
      >
        Buy Until Sale Ends
      </button>
      <ResearchPurchasePreview :items="saleEndsPreview" empty-text="Nothing to buy right now" />
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

interface RateSummary {
  before: number;
  after: number;
}

defineProps<{
  autoBuyAlwaysOn: boolean;
  deliveryImpactOnly: boolean;
  roiMode: RoiMode;
  canBuyUntilSaleWarning: boolean;
  canBuyUntilRoiDeadline: boolean;
  canBuyUntilSaleDeadline: boolean;
  quickBuyPreview: ResearchSummaryItem[];
  quickBuyEarningsSummary: RateSummary;
  saleAwarePreview: ResearchSummaryItem[];
  saleAwareExcludedAt100Preview: ResearchSummaryItem[];
  saleEndsPreview: ResearchSummaryItem[];
  saleAwareEarningsSummary70: RateSummary;
  saleAwareEarningsSummary100: RateSummary;
  saleEndsDeliverySummary: RateSummary | null;
}>();

defineEmits<{
  (e: 'update:autoBuyAlwaysOn', value: boolean): void;
  (e: 'quick-buy', thresholdSeconds: number): void;
  (e: 'update:quickBuyThresholdSeconds', value: number): void;
  (e: 'auto-buy-update', state: { threshold: number; alwaysOn: boolean }): void;
  (e: 'update:deliveryImpactOnly', value: boolean): void;
  (e: 'update:roiMode', value: RoiMode): void;
  (e: 'buy-until-sale-warning'): void;
  (e: 'buy-until-roi-deadline'): void;
  (e: 'buy-until-sale-deadline'): void;
}>();
</script>
