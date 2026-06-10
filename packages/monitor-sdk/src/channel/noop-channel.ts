import type { ChannelMessage, MonitorChannel } from "./channel";

export function createNoopChannel(): MonitorChannel {
  // Channel 层先用空实现占位，后续可替换为 BroadcastChannel 做多 tab 协同。
  return {
    publish(_message: ChannelMessage) {
      // Reserved for future BroadcastChannel support.
    },
    subscribe(_handler: (message: ChannelMessage) => void) {
      return () => undefined;
    },
    close() {
      // Nothing to close for noop channel.
    }
  };
}
