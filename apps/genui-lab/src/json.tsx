import { Text } from "./projection";
import {
  JSONUIProvider,
  Renderer,
  useBoundProp,
  type ComponentRegistry,
} from "@json-render/react";
import type { Spec } from "@json-render/core";
import {
  Stack,
  Control,
  Metric,
  Table,
  Graphic,
  rank,
  rankParams,
} from "./catalog";
const registry: ComponentRegistry = {
  Stack: ({ children }) => <Stack>{children}</Stack>,
  Text: ({ element }) => <Text text={element.props.text} />,
  Control: ({ element, bindings }) => {
    const p = element.props;
    const [value, change] = useBoundProp(p.value, bindings?.value);
    return (
      <Control
        label={p.label}
        min={p.min}
        max={p.max}
        choices={p.choices}
        value={value}
        onChange={change}
      />
    );
  },
  Metric: ({ element: { props: p } }) => (
    <Metric label={p.label} value={p.value} />
  ),
  Table: ({ element }) => <Table values={element.props.values} />,
  Graphic: ({ element: { props: p } }) => (
    <Graphic label={p.label} items={p.items} />
  ),
};
const functions = {
  Rank: (a: Record<string, unknown>) => rank(rankParams.parse(a)),
  Add: ({ a, b }: Record<string, unknown>) => Number(a) + Number(b),
  Multiply: ({ a, b }: Record<string, unknown>) => Number(a) * Number(b),
  Excess: ({ a, b }: Record<string, unknown>) =>
    Math.max(0, Number(a) - Number(b)),
};
export function JsonPane({
  source,
  state,
  update,
}: {
  source: string;
  state: Record<string, number>;
  update: (state: Record<string, number>) => void;
}) {
  return (
    <JSONUIProvider
      registry={registry}
      functions={functions}
      initialState={state}
      onStateChange={(changes) =>
        update(
          Object.fromEntries(
            changes.map((c) => [c.path.slice(1), Number(c.value)]),
          ),
        )
      }
    >
      <Renderer spec={JSON.parse(source) as Spec} registry={registry} />
    </JSONUIProvider>
  );
}
