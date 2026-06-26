import { forwardRef } from "react";
import { cn } from "@/lib/cn";
import { SUICoreIcon } from "@/components/sui/core/Icon/SUICoreIcon";
import type { IconName } from "@/components/sui/constants/icons";
import { buttonVariants, type ButtonVariantProps } from "./buttonVariants";

type OwnProps = ButtonVariantProps & {
  text?: string;
  icon?: IconName;
  iconPosition?: "left" | "right";
  /** Icon rendered after the label, independent of `icon` (e.g. a dropdown chevron). */
  trailingIcon?: IconName;
  /** Render as an anchor instead of a button. Framework-agnostic (plain <a>). */
  href?: string;
  /** Anchor target when `href` is set; defaults to same-tab for in-app links. */
  target?: string;
  type?: "button" | "submit";
  loading?: boolean;
  className?: string;
};

/**
 * Native button attributes (onClick, data-*, aria-*, etc.) pass through via
 * `...rest`, and the underlying element forwards its ref — so the button can be
 * used directly as a Radix `asChild` trigger (Popover / Select / Tooltip).
 *
 * Framework-agnostic: when `href` is provided it renders a plain `<a>` (no
 * next/link dependency), keeping the package publishable to npm.
 */
type Props = OwnProps & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof OwnProps>;

export const SUICoreButton = forwardRef<HTMLButtonElement | HTMLAnchorElement, Props>(
  function SUICoreButton(
    {
      text,
      icon,
      iconPosition = "left",
      trailingIcon,
      href,
      target,
      type = "button",
      disabled,
      loading,
      className,
      size,
      variant,
      width,
      iconOnly,
      "aria-label": ariaLabel,
      ...rest
    },
    ref,
  ) {
    const classes = cn(buttonVariants({ size, variant, width, iconOnly }), className);

    const content = (
      <>
        {icon && iconPosition === "left" && <SUICoreIcon name={icon} />}
        {text && !iconOnly && <span>{text}</span>}
        {icon && iconPosition === "right" && <SUICoreIcon name={icon} />}
        {trailingIcon && !iconOnly && <SUICoreIcon name={trailingIcon} />}
      </>
    );

    if (href) {
      const anchorRest = rest as React.AnchorHTMLAttributes<HTMLAnchorElement>;
      // External links open safely; relative/in-app links stay same-tab.
      const isExternal = /^https?:\/\//.test(href);
      const resolvedTarget = target ?? (isExternal ? "_blank" : undefined);
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          target={resolvedTarget}
          rel={resolvedTarget === "_blank" ? "noopener noreferrer" : undefined}
          className={classes}
          aria-label={ariaLabel}
          {...anchorRest}
        >
          {content}
        </a>
      );
    }

    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type={type}
        disabled={disabled || loading}
        className={classes}
        aria-label={ariaLabel}
        {...rest}
      >
        {content}
      </button>
    );
  },
);

SUICoreButton.displayName = "SUICoreButton";
