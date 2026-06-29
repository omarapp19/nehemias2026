// Design system Nehemías — punto de entrada
export { theme } from "./theme.config.js";
export type { Theme, ThemeColorName } from "./theme.config.js";
export { themeToCssVars, colorVar } from "./css-vars.js";

export { cn } from "./lib/cn.js";
export {
  formatMoney,
  formatNumber,
  formatDate,
  type Currency,
} from "./lib/format.js";

export { Button, buttonClasses } from "./components/Button.js";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./components/Button.js";
export { Field, Input, Textarea, Select } from "./components/Field.js";
export {
  Badge,
  BadgeDonacion,
  BadgeStock,
  nivelStock,
  type BadgeTone,
  type EstadoDonacion,
  type EstadoStock,
} from "./components/Badge.js";
export { Card, CardBody, SectionHeader } from "./components/Card.js";
export { Money } from "./components/Money.js";
export { Stat } from "./components/Stat.js";
export { ProgressBar, type ProgressTone } from "./components/Progress.js";
export { Skeleton } from "./components/Skeleton.js";
export * from "./components/icons.js";
