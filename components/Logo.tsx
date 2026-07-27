import clsx from "clsx";

export default function Logo({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    sm: "w-8 h-8 text-base rounded-lg",
    md: "w-11 h-11 text-xl rounded-xl",
    lg: "w-16 h-16 text-3xl rounded-2xl",
  }[size];

  return (
    <div
      className={clsx(
        "flex items-center justify-center bg-brand-red font-bold text-white shrink-0",
        sizeClasses,
        className
      )}
      aria-label="N1 Company"
    >
      N
    </div>
  );
}
