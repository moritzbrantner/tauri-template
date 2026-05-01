import type { Meta, StoryObj } from "@storybook/react-vite";
import { QueryClientProvider } from "@tanstack/react-query";
import { createAppQueryClient } from "./app/queryClient";
import App from "./App";

const meta = {
  title: "App",
  component: App,
  decorators: [
    (Story) => (
      <QueryClientProvider client={createAppQueryClient()}>
        <Story />
      </QueryClientProvider>
    ),
  ],
} satisfies Meta<typeof App>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
