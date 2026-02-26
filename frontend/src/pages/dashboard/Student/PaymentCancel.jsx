import { motion } from "framer-motion";
import { FaTimesCircle, FaArrowLeft, FaInfoCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function PaymentCancel() {
  const navigate = useNavigate();

  return (
    <div className="payment-cancel-wrapper">
      <motion.div
        className="cancel-card"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* ERROR ICON WITH SHAKE ANIMATION */}
        <motion.div
          className="error-icon-wrapper"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          <motion.div
            animate={{ 
              rotate: [0, -10, 10, -10, 10, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <FaTimesCircle className="error-icon" />
          </motion.div>
        </motion.div>

        {/* TITLE */}
        <motion.h2
          className="cancel-title"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Payment Cancelled
        </motion.h2>

        {/* SUBTITLE */}
        <motion.p
          className="cancel-subtitle"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <FaInfoCircle className="info-icon" />
          Your payment was not completed. You can try again anytime.
        </motion.p>

        {/* INFO BOX */}
        <motion.div
          className="info-box"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="info-row">
            <span>💡 Tip:</span>
            <span>Check your internet connection and try again</span>
          </div>
          <div className="info-row">
            <span>⏰ Session:</span>
            <span>Valid for 15 minutes</span>
          </div>
        </motion.div>

        {/* ACTION BUTTONS */}
        <motion.div
          className="action-buttons"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <button
            className="btn-retry"
            onClick={() => navigate("/student/fees")}
          >
            <FaArrowLeft /> Back to Fees
          </button>

          <button
            className="btn-help"
            onClick={() => window.open("/student/support", "_blank")}
          >
            Need Help?
          </button>
        </motion.div>
      </motion.div>

      <style>{`
        .payment-cancel-wrapper {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
          padding: 20px;
        }

        .cancel-card {
          background: white;
          padding: 40px;
          border-radius: 20px;
          box-shadow: 0 15px 40px rgba(220, 53, 69, 0.2);
          width: 100%;
          max-width: 500px;
          text-align: center;
        }

        .error-icon-wrapper {
          width: 100px;
          height: 100px;
          margin: 0 auto 20px;
          background: #fee2e2;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .error-icon {
          font-size: 50px;
          color: #dc3545;
        }

        .cancel-title {
          font-weight: 700;
          color: #dc3545;
          margin-bottom: 10px;
        }

        .cancel-subtitle {
          color: #6b7280;
          margin-bottom: 25px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .info-icon {
          color: #3b82f6;
        }

        .info-box {
          background: #f8fafc;
          padding: 15px;
          border-radius: 12px;
          margin-bottom: 25px;
          text-align: left;
        }

        .info-row {
          display: flex;
          gap: 10px;
          padding: 5px 0;
          font-size: 14px;
        }

        .info-row:first-child {
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 10px;
        }

        .action-buttons {
          display: flex;
          justify-content: center;
          gap: 15px;
          flex-wrap: wrap;
        }

        .btn-retry {
          padding: 12px 24px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, #0f3a4a, #1a4b6d);
          color: white;
          cursor: pointer;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s ease;
        }

        .btn-retry:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(15, 58, 74, 0.4);
        }

        .btn-help {
          padding: 12px 24px;
          border-radius: 10px;
          border: 2px solid #0f3a4a;
          background: white;
          color: #0f3a4a;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .btn-help:hover {
          background: #0f3a4a;
          color: white;
        }
      `}</style>
    </div>
  );
}
