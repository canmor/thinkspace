import { createContext, useContext, useLayoutEffect } from "react";
export const ProjectionContext = createContext<Record<string, unknown> | null>(
  null,
);
export function useProjection(key: string, value: unknown) {
  const fields = useContext(ProjectionContext);
  useLayoutEffect(() => {
    if (!fields) return;
    fields[key] = value;
    return () => {
      delete fields[key];
    };
  }, [fields, key, value]);
}
export function Text({ text }: { text: string }) {
  useProjection("description", text);
  return <p>{text}</p>;
}
