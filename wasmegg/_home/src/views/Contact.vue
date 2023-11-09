<template>
  <h1 class="mb-4 text-center text-h1 leading-6 font-medium text-gray-900">Contact</h1>

  <div class="p-4 bg-green-50 rounded-lg shadow-inner">
    <div class="text-center text-base leading-snug">
      I am <span class="font-medium">CarpetSage#0100</span> on Discord.
    </div>
    <div class="text-center text-base leading-snug mt-2">
      Join <base-link href="https://discord.gg/NUqJMh2Kf8">my server</base-link> to <span class="text-purple-500">follow
        development updates</span>,
      <span class="text-fuchsia-500">report issues</span>, and
      <span class="text-pink-500">discuss suggestions</span>:
    </div>
  </div>

  <p>
    The <base-link href="https://discord.gg/egginc">Egg, Inc. Discord server</base-link> is the main
    base of this site's users, and
    <span class="underline">game-related discussions should still happen over there</span>. However,
    a few factors make it inadequate for certain things specifically about my tools:
  </p>

  <ul>
    <li>
      A few people have expressed interest in a way to stay up-to-date on my tooling updates. While
      Egg, Inc. server moderators are often kind enough to pin my announcements (note: I never
      request pinning), that's not a notification system.
    </li>
    <li>
      Lacking an explicit bug report channel, certain users may be too shy to DM me about bugs they
      encounter, or have to debate hard about whether to DM and apologize profusely when they do.
    </li>
    <li>
      Users mostly suggest new features in one of three ways:
      <ul class="my-1">
        <li>
          Post the suggestion somewhere public without tagging me, which most likely never reaches
          me.
        </li>
        <li>
          Post the suggestion somewhere public, tagging me. It does reach me, usually hours later,
          and I then debate whether to reply and cause a digression in the channel. If I want to
          reference it later I need to dig it out of my list of mentions.
        </li>
        <li>
          Direct message me. This keeps the discussion focused, but given the steady stream of DMs I
          get and lack of search accross different people's DMs, it's almost impossible to find a
          suggestion a couple days later unless I note down the message URL in my ticketing system,
          which is rather inconvenient, and impossible if I decided not to create a ticket during
          the initial triage.
        </li>
      </ul>
      None of these is satisfying.
    </li>
    <li>
      Sometimes there are more technical discussions about my tools (especially self-hosted
      EggContractor) which is inappropriate for any public channel.
    </li>
  </ul>

  <p>
    Therefore, <base-link href="https://discord.gg/NUqJMh2Kf8">my own server</base-link> is the remedy,
    and the scope should be clear from the aforementioned shortcomings of the main Egg, Inc. server.
  </p>

  <p>
    Note that <span class="underline">I'll still post major updates to the main server</span>, and
    <span class="underline">you may still DM me</span> if you don't want to join my special interest
    server.
  </p>

  <p><base-router-link :to="{ name: 'home' }">Back to home page</base-router-link></p>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import discordWordmarkUrl from '@/icons/discord-wordmark.svg';
import BaseLink from '@/components/BaseLink.vue';
import BaseRouterLink from '@/components/BaseRouterLink.vue';

export default defineComponent({
  components: {
    BaseLink,
    BaseRouterLink,
  },
  setup() {
    return {
      discordWordmarkUrl,
    };
  },
});
</script>

<style lang="postcss" scoped>
p {
  @apply my-4;
}
</style>
