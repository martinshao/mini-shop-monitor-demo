export type ChannelMessage = {
  type: string;
  data?: Record<string, unknown>;
};

export type MonitorChannel = {
  publish(message: ChannelMessage): void;
  subscribe(handler: (message: ChannelMessage) => void): () => void;
  close(): void;
};
