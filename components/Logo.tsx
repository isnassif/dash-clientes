import clsx from "clsx";

export default function Logo({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    sm: "w-8 h-8 text-sm rounded-lg",
    md: "w-11 h-11 text-lg rounded-xl",
    lg: "w-16 h-16 text-2xl rounded-2xl",
  }[size];

  return (
    <div
      className={clsx(
        "relative flex items-center justify-center bg-brand-red font-display font-semibold italic text-white shrink-0",
        sizeClasses,
        className
      )}
      aria-label="N1 Company"
    >
      N1
      <span className="absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/15" />
    </div>
  );
}
