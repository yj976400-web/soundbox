export default function FormField({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1.5">{label}</span>
      <input
        {...props}
        className="w-full rounded-xl border border-panel-border bg-bg px-3.5 py-2.5 text-sm outline-none focus:border-signal"
      />
    </label>
  );
}
