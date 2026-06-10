import type { ChannelMessage, MonitorChannel } from "./channel";

export function createNoopChannel(): MonitorChannel {
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
