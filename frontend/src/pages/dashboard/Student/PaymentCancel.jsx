import { FaTimesCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function PaymentCancel() {
  const navigate = useNavigate();

  return (
    <div className="vh-100 d-flex flex-column justify-content-center align-items-center text-center">
      <FaTimesCircle className="text-danger mb-3" size={50} />
      <h4>Payment Cancelled</h4>
      <p>You can try again anytime.</p>

      <button
        className="btn btn-primary"
        onClick={() => navigate("/student/fees")}
      >
        Back to Fees
      </button>
    </div>
  );
}
