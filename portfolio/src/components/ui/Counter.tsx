import { Content } from "./Content";
import { cx } from "./cx";

const SIZE = {
  m: "text-display-m",
  l: "text-display-l",
  xl: "text-display-xl",
} as const;

type CounterProps = {
  value: number;
  /** Unit in mono beside the figure, e.g. "YRS", "%". */
  suffix?: string;
  label?: string;
  /** Fraction digits; defaults to those in `value`. */
  decimals?: number;
  size?: keyof typeof SIZE;
  className?: string;
};

const fractionDigits = (value: number) => String(value).split(".")[1]?.length ?? 0;

/**
 * Display-font figure on tabular numerals. Static: renders the final value,
 * which is also the reduced-motion and no-JS state. CALIBRATE (P0-03) reads
 * `data-value` / `data-decimals` and counts up to the rendered text.
 */
export function Counter({
  value,
  suffix,
  label,
  decimals = fractionDigits(value),
  size = "m",
  className,
}: CounterProps) {
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

  return (
    <div
      className={cx("counter", className)}
      data-anim="calibrate"
      data-value={value}
      data-decimals={decimals}
    >
      <p className="counter__figure">
        <data value={value} className={cx("counter__value", SIZE[size])} data-anim-part="value">
          {formatted}
        </data>
        {suffix && <span className="counter__suffix">{suffix}</span>}
      </p>
      {label && <Content as="p" value={label} className="counter__label" />}
    </div>
  );
}
