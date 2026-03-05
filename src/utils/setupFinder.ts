import * as OBC from "@thatopen/components";

export const setupFinderQueries = (components: OBC.Components) => {
  const finder = components.get(OBC.ItemsFinder);

  finder.create("FlowMeters", [
    {
      categories: [/IFCFLOWCONTROLLER/],
      attributes: { queries: [{ name: /Name/, value: /Flowmeter/ }] },
    },
  ]);
  finder.create("Flow Segment", [{ categories: [/IFCFLOWSEGMENT/] }]);
  finder.create("Leak Point Pit", [
    {
      categories: [/IFCBUILDINGELEMENTPROXY/],
      attributes: { queries: [{ name: /Name/, value: /Leak/ }] },
    },
  ]);
  finder.create("Chamber", [
    {
      categories: [/IFCBUILDINGELEMENTPROXY/],
      attributes: { queries: [{ name: /Name/, value: /Chamber/ }] },
    },
  ]);
  finder.create("Manhole", [
    {
      categories: [/IFCFLOWTERMINAL/],
      attributes: { queries: [{ name: /Name/, value: /Manhole/ }] },
    },
  ]);
  finder.create("Microphone Pit", [
    {
      categories: [/IFCBUILDINGELEMENTPROXY/],
      attributes: { queries: [{ name: /Name/, value: /Microphone/ }] },
    },
  ]);
  finder.create("Fire Hydrant", [
    {
      categories: [/IFCBUILDINGELEMENTPROXY/],
      attributes: { queries: [{ name: /Name/, value: /M_Fire/ }] },
    },
  ]);
};
