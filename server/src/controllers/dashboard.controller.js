import { User, Product, Deposit } from "../db/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getDashboardStats = asyncHandler(async (req, res) => {
  try {
    // Get total members count
    const totalMembers = await User.countDocuments();

    // Get total deposits amount
    const totalDepositsResult = await Deposit.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);
    const totalDeposits = totalDepositsResult[0]?.totalAmount || 0;

    // Get total products count
    const totalProducts = await Product.countDocuments();

    // Get recent transactions (last 10 deposits)
    const recentTransactions = await Deposit.find()
      .populate("memberId", "name uuid")
      .sort({ createdAt: -1 })
      .limit(10)
      .select("amount depositDate type memberId description");

    // Format transactions for frontend
    const formattedTransactions = recentTransactions.map((transaction) => ({
      id: transaction._id,
      member: transaction.memberId?.name || "Unknown",
      memberUuid: transaction.memberId?.uuid || "",
      amount: transaction.amount,
      date: transaction.depositDate
        ? new Date(transaction.depositDate).toLocaleDateString("id-ID")
        : new Date(transaction.createdAt).toLocaleDateString("id-ID"),
      type: transaction.type || "Setoran",
      description: transaction.description || "",
    }));

    res.status(200).json({
      success: true,
      data: {
        totalMembers,
        totalDeposits,
        totalProducts,
        recentTransactions: formattedTransactions,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data dashboard",
      error: error.message,
    });
  }
});

export { getDashboardStats };
