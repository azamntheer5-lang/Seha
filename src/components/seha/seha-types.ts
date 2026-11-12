/** Client-side hash routes — mirrors the reference SPA routing exactly. */
export type SehaRoute =
  | "home" // #/
  | "services" // #/cms/services
  | "seha-plus" // #/seha-plus
  | "inquiries" // #/inquiries
  | "sl" // #/inquiries/slenquiry
  | "faq" // #/faq
  | "contact" // #/ContactUs
  | "ops"; // #/ops — hidden issuing portal (unlocked from the logo)

/** Map a browser hash to a route (unknown/empty → "sl", the inquiry centerpiece). */
export function hashToRoute(hash: string): SehaRoute {
  const h = hash.replace(/^#/, "").replace(/\/+$/, "").toLowerCase();
  const [path] = h.split("?");
  switch (path) {
    case "":
    case "/":
      return "home";
    case "/cms/services":
      return "services";
    case "/seha-plus":
      return "seha-plus";
    case "/inquiries":
      return "inquiries";
    case "/inquiries/slenquiry":
      return "sl";
    case "/faq":
      return "faq";
    case "/contactus":
      return "contact";
    case "/ops":
      return "ops";
    default:
      return "sl";
  }
}

/** Map a route back to its platform hash. */
export function routeToHash(route: SehaRoute): string {
  switch (route) {
    case "home":
      return "#/";
    case "services":
      return "#/cms/services";
    case "seha-plus":
      return "#/seha-plus";
    case "inquiries":
      return "#/inquiries";
    case "sl":
      return "#/inquiries/slenquiry";
    case "faq":
      return "#/faq";
    case "contact":
      return "#/ContactUs";
    case "ops":
      return "#/ops";
  }
}

/** Header nav tab highlighted for a given route. */
export function routeToTab(route: SehaRoute): string {
  if (route === "inquiries" || route === "sl") return "inquiries";
  return route;
}
