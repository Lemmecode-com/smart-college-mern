export default function Error({ message }) {
  return (
    <div className="alert alert-danger text-center">
      {message || "Something went wrong"}
    </div>
  );
}
