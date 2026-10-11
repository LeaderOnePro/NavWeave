import "@testing-library/jest-dom/vitest";

// jsdom lacks SVGPoint.createSVGPoint matrix helpers used by some SVG math;
// NavWeave maps pointer coordinates manually, so nothing extra is needed.
