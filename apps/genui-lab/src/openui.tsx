import { Text } from "./projection";
import {
  createLibrary,
  defineComponent,
  Renderer,
  reactive,
  useStateField,
} from "@openuidev/react-lang";
import { z } from "zod";
import {
  Stack,
  Control,
  Metric,
  Table,
  Graphic,
  shapes,
  scores,
} from "./catalog";
const text = defineComponent({
  name: "Text",
  description: "Paragraph",
  props: z.object({ text: z.string() }),
  component: ({ props }) => <Text text={props.text} />,
});
const control = defineComponent({
  name: "Control",
  description: "Numeric input with optional named choices",
  props: z.object({
    label: z.string(),
    min: z.number(),
    max: z.number(),
    choices: z.array(z.string()),
    value: reactive(z.number()),
  }),
  component: ({ props }) => {
    const field = useStateField(props.label, props.value);
    return (
      <Control
        {...props}
        value={Number(field.value)}
        onChange={field.setValue}
      />
    );
  },
});
const metric = defineComponent({
  name: "Metric",
  description: "Named scalar",
  props: z.object({ label: z.string(), value: z.number() }),
  component: ({ props }) => <Metric {...props} />,
});
const table = defineComponent({
  name: "Table",
  description: "Ranked values",
  props: z.object({ values: scores }),
  component: ({ props }) => <Table {...props} />,
});
const graphic = defineComponent({
  name: "Graphic",
  description: "Vector graphic",
  props: z.object({ label: z.string(), items: shapes }),
  component: ({ props }) => <Graphic {...props} />,
});
const stack = defineComponent({
  name: "Stack",
  description: "Vertical layout",
  props: z.object({
    items: z.array(
      z.union([text.ref, control.ref, metric.ref, table.ref, graphic.ref]),
    ),
  }),
  component: ({ props, renderNode }) => (
    <Stack>{renderNode(props.items)}</Stack>
  ),
});
const library = createLibrary({
  root: "Stack",
  components: [stack, text, control, metric, table, graphic],
});
export function OpenPane({
  source,
  state,
  update,
  fail,
}: {
  source: string;
  state: Record<string, number>;
  update: (state: Record<string, number>) => void;
  fail: (message: string) => void;
}) {
  return (
    <Renderer
      response={source}
      library={library}
      initialState={Object.fromEntries(
        Object.entries(state).map(([k, v]) => ["$" + k, v]),
      )}
      onStateUpdate={(s) =>
        update(
          Object.fromEntries(
            Object.entries(s)
              .filter(([k, v]) => k.startsWith("$") && typeof v === "number")
              .map(([k, v]) => [k.slice(1), Number(v)]),
          ),
        )
      }
      onError={(e) => fail(e.length ? JSON.stringify(e) : "")}
    />
  );
}
