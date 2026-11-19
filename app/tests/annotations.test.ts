/** Annotation access stays closed unless the build, URL or remembered explicit grant permits it. */
import { expect, it } from "vitest";
import { annotationAccess } from "@/lib/client/annotations";

it.each([
  [false, false, false, false],
  [true, false, false, true],
  [false, true, false, true],
  [false, false, true, true],
])("build=%s query=%s stored=%s grants access=%s", (build, query, stored, expected) => {
  expect(annotationAccess(build, query, stored)).toBe(expected);
});
