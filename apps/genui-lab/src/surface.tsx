import { Component, type ReactNode } from "react";
import { Control, Graphic, Metric, Stack, Table } from "./catalog";
import { Text } from "./projection";
import type { Frame } from "./admission/policy";
export class ArtifactBoundary extends Component<
  { children: ReactNode; onFailure: (message: string) => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure("Artifact rendering failed");
  }
  render() {
    return this.state.failed ? (
      <p>Artifact unavailable</p>
    ) : (
      this.props.children
    );
  }
}
export function Surface({
  frame,
  change,
}: {
  frame: Frame;
  change: (k: string, v: number) => void;
}) {
  return (
    <Stack>
      {frame.items.map((item, i) => {
        switch (item.type) {
          case "Control":
            return (
              <Control
                key={i}
                {...item.props}
                onChange={(v) => change(item.binding!, v)}
              />
            );
          case "Graphic":
            return <Graphic key={i} {...item.props} />;
          case "Metric":
            return <Metric key={i} {...item.props} />;
          case "Table":
            return <Table key={i} {...item.props} />;
          case "Text":
            return <Text key={i} {...item.props} />;
        }
      })}
    </Stack>
  );
}
