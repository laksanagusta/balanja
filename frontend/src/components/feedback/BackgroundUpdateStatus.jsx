export default function BackgroundUpdateStatus({ active, label = "Memperbarui data" }) {
  return (
    <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {active ? label : ""}
    </span>
  );
}
