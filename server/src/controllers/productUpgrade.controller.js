import mongoose from "mongoose";
import { Member } from "../models/member.model.js";
import { Product } from "../models/product.model.js";
import { Savings } from "../models/savings.model.js";
import { ProductUpgrade } from "../models/productUpgrade.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Menghitung kompensasi upgrade produk
 * Rumus: (jumlah_upgrade - jumlah_sekarang) x bulan_sudah_nabung / sisa_bulan
 */
const calculateUpgradeCompensation = asyncHandler(async (req, res) => {
  const { memberUuid } = req.params;
  const { newProductId } = req.body;

  try {
    // 1. Ambil data member dengan produk saat ini
    const member = await Member.findOne({ uuid: memberUuid })
      .populate("productId", "title depositAmount returnProfit termDuration");

    if (!member) {
      throw new ApiError(404, "Member tidak ditemukan");
    }

    if (!member.productId) {
      throw new ApiError(400, "Member belum memiliki produk aktif");
    }

    // 2. Ambil data produk baru
    const newProduct = await Product.findById(newProductId);
    if (!newProduct) {
      throw new ApiError(404, "Produk baru tidak ditemukan");
    }

    // 3. Ambil semua savings yang sudah approved untuk member ini
    const approvedSavings = await Savings.find({
      memberId: member._id,
      type: "Setoran",
      status: "Approved"
    }).sort({ installmentPeriod: 1 });

    if (approvedSavings.length === 0) {
      throw new ApiError(400, "Member belum memiliki riwayat simpanan yang disetujui");
    }

    // 4. Hitung data untuk kompensasi
    const currentProduct = member.productId;
    const bulanSudahNabung = approvedSavings.length;
    const sisaBulan = currentProduct.termDuration - bulanSudahNabung;

    // Validasi apakah masih ada sisa bulan
    if (sisaBulan <= 0) {
      throw new ApiError(400, "Periode simpanan sudah selesai, tidak bisa upgrade");
    }

    // 5. Hitung kompensasi berdasarkan rumus
    const setoranSekarang = currentProduct.depositAmount;
    const setoranBaru = newProduct.depositAmount;
    const selisihSetoran = setoranBaru - setoranSekarang;

    // Rumus: (jumlah_upgrade - jumlah_sekarang) x bulan_sudah_nabung / sisa_bulan
    const kompensasi = (selisihSetoran * bulanSudahNabung) / sisaBulan;
    const setoranBaruPerBulan = setoranBaru + kompensasi;

    // 6. Hitung total yang sudah dibayar dan proyeksi
    const totalSudahDibayar = approvedSavings.reduce((sum, saving) => sum + saving.amount, 0);
    const totalKompensasi = kompensasi * sisaBulan;

    // 7. Siapkan response data
    const upgradeCalculation = {
      memberInfo: {
        uuid: member.uuid,
        name: member.name
      },
      currentProduct: {
        id: currentProduct._id,
        title: currentProduct.title,
        depositAmount: currentProduct.depositAmount,
        termDuration: currentProduct.termDuration
      },
      newProduct: {
        id: newProduct._id,
        title: newProduct.title,
        depositAmount: newProduct.depositAmount,
        termDuration: newProduct.termDuration
      },
      savingsProgress: {
        bulanSudahNabung,
        sisaBulan,
        totalSudahDibayar,
        approvedSavingsCount: approvedSavings.length
      },
      compensation: {
        selisihSetoran,
        kompensasiPerBulan: Math.round(kompensasi),
        setoranBaruPerBulan: Math.round(setoranBaruPerBulan),
        totalKompensasi: Math.round(totalKompensasi),
        formula: `(${setoranBaru} - ${setoranSekarang}) x ${bulanSudahNabung} / ${sisaBulan} = ${Math.round(kompensasi)}`
      },
      upgradeViability: {
        canUpgrade: selisihSetoran > 0, // Hanya bisa upgrade ke produk yang lebih tinggi
        reason: selisihSetoran <= 0 ? "Produk baru harus memiliki setoran yang lebih tinggi" : "Upgrade dapat dilakukan"
      }
    };

    res.status(200).json(
      new ApiResponse(200, upgradeCalculation, "Perhitungan kompensasi upgrade berhasil")
    );

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error("Calculate upgrade compensation error:", error);
    throw new ApiError(500, "Gagal menghitung kompensasi upgrade");
  }
});

/**
 * Eksekusi upgrade produk member dengan data integrity yang proper
 */
const executeProductUpgrade = asyncHandler(async (req, res) => {
  const { memberUuid } = req.params;
  const { newProductId, confirmUpgrade } = req.body;

  if (!confirmUpgrade) {
    throw new ApiError(400, "Konfirmasi upgrade diperlukan");
  }

  try {
    // 1. Hitung ulang kompensasi untuk validasi
    const member = await Member.findOne({ uuid: memberUuid })
      .populate("productId", "title depositAmount returnProfit termDuration");

    if (!member) {
      throw new ApiError(404, "Member tidak ditemukan");
    }

    if (!member.productId) {
      throw new ApiError(400, "Member belum memiliki produk aktif");
    }

    // Ambil data produk baru
    const newProduct = await Product.findById(newProductId);
    if (!newProduct) {
      throw new ApiError(404, "Produk baru tidak ditemukan");
    }

    // Ambil semua savings yang sudah approved untuk member ini
    const approvedSavings = await Savings.find({
      memberId: member._id,
      type: "Setoran",
      status: "Approved"
    }).sort({ installmentPeriod: 1 });

    if (approvedSavings.length === 0) {
      throw new ApiError(400, "Member belum memiliki riwayat simpanan yang disetujui");
    }

    // Hitung data untuk kompensasi
    const currentProduct = member.productId;
    const bulanSudahNabung = approvedSavings.length;
    const sisaBulan = currentProduct.termDuration - bulanSudahNabung;

    // Validasi apakah masih ada sisa bulan
    if (sisaBulan <= 0) {
      throw new ApiError(400, "Periode simpanan sudah selesai, tidak bisa upgrade");
    }

    // Hitung kompensasi berdasarkan rumus
    const setoranSekarang = currentProduct.depositAmount;
    const setoranBaru = newProduct.depositAmount;
    const selisihSetoran = setoranBaru - setoranSekarang;

    // Validasi upgrade hanya ke produk yang lebih tinggi
    if (selisihSetoran <= 0) {
      throw new ApiError(400, "Produk baru harus memiliki setoran yang lebih tinggi");
    }

    // Rumus: (jumlah_upgrade - jumlah_sekarang) x bulan_sudah_nabung / sisa_bulan
    const kompensasi = (selisihSetoran * bulanSudahNabung) / sisaBulan;
    const setoranBaruPerBulan = setoranBaru + kompensasi;
    const totalKompensasi = kompensasi * sisaBulan;

    // Siapkan data calculation
    const calculation = {
      currentProduct: {
        id: currentProduct._id,
        title: currentProduct.title,
        depositAmount: currentProduct.depositAmount,
        termDuration: currentProduct.termDuration
      },
      newProduct: {
        id: newProduct._id,
        title: newProduct.title,
        depositAmount: newProduct.depositAmount,
        termDuration: newProduct.termDuration
      },
      savingsProgress: {
        bulanSudahNabung,
        sisaBulan,
        totalSudahDibayar: approvedSavings.reduce((sum, saving) => sum + saving.amount, 0),
        approvedSavingsCount: approvedSavings.length
      },
      compensation: {
        selisihSetoran,
        kompensasiPerBulan: Math.round(kompensasi),
        setoranBaruPerBulan: Math.round(setoranBaruPerBulan),
        totalKompensasi: Math.round(totalKompensasi),
        formula: `(${setoranBaru} - ${setoranSekarang}) x ${bulanSudahNabung} / ${sisaBulan} = ${Math.round(kompensasi)}`
      },
      upgradeViability: {
        canUpgrade: true,
        reason: "Upgrade dapat dilakukan"
      }
    };

    if (!calculation.upgradeViability.canUpgrade) {
      throw new ApiError(400, calculation.upgradeViability.reason);
    }

    // 2. Cek apakah sudah ada upgrade aktif
    const existingUpgrade = await ProductUpgrade.findOne({
      memberId: member._id,
      status: "Active"
    });

    if (existingUpgrade) {
      throw new ApiError(400, "Member sudah memiliki upgrade aktif. Selesaikan upgrade sebelumnya terlebih dahulu.");
    }

    // 3. Mulai transaction untuk data integrity
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 4. Simpan record upgrade history
      const upgradeRecord = new ProductUpgrade({
        memberId: member._id,
        oldProductId: member.productId,
        newProductId: newProductId,
        upgradeDate: new Date(),
        periodWhenUpgraded: calculation.savingsProgress.bulanSudahNabung,
        remainingPeriods: calculation.savingsProgress.sisaBulan,
        compensationPerMonth: calculation.compensation.kompensasiPerBulan,
        newMonthlyAmount: calculation.compensation.setoranBaruPerBulan,
        totalCompensation: calculation.compensation.totalKompensasi,
        calculationFormula: calculation.compensation.formula,
        status: "Active",
        notes: `Upgrade dari ${calculation.currentProduct.title} ke ${calculation.newProduct.title}`
      });

      await upgradeRecord.save({ session });

      // 5. Update member productId
      member.productId = newProductId;
      await member.save({ session });

      // 6. Update semua savings yang belum dibayar (periode > bulanSudahNabung) 
      // untuk menggunakan productId baru dan amount baru
      const nextPeriod = calculation.savingsProgress.bulanSudahNabung + 1;
      
      await Savings.updateMany(
        {
          memberId: member._id,
          installmentPeriod: { $gte: nextPeriod },
          status: { $in: ["Pending", "Belum Bayar"] }
        },
        {
          $set: {
            productId: newProductId,
            amount: calculation.compensation.setoranBaruPerBulan,
            description: `Simpanan periode upgrade - ${calculation.newProduct.title} + kompensasi`
          }
        },
        { session }
      );

      // 7. Commit transaction
      await session.commitTransaction();

      // 8. Populate data untuk response
      await upgradeRecord.populate([
        { path: "oldProduct", select: "title depositAmount" },
        { path: "newProduct", select: "title depositAmount" },
        { path: "member", select: "uuid name" }
      ]);

      const upgradeResult = {
        success: true,
        upgradeId: upgradeRecord._id,
        memberUuid,
        oldProduct: calculation.currentProduct,
        newProduct: calculation.newProduct,
        compensation: calculation.compensation,
        upgradeDate: upgradeRecord.upgradeDate,
        nextPaymentAmount: calculation.compensation.setoranBaruPerBulan,
        remainingPeriods: calculation.savingsProgress.sisaBulan,
        message: "Upgrade berhasil! Pembayaran selanjutnya akan menggunakan nominal baru + kompensasi."
      };

      res.status(200).json(
        new ApiResponse(200, upgradeResult, "Upgrade produk berhasil dilakukan dengan aman")
      );

    } catch (transactionError) {
      // Rollback transaction jika ada error
      await session.abortTransaction();
      throw transactionError;
    } finally {
      session.endSession();
    }

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error("Execute product upgrade error:", error);
    throw new ApiError(500, "Gagal melakukan upgrade produk");
  }
});

/**
 * Get upgrade history untuk member
 */
const getUpgradeHistory = asyncHandler(async (req, res) => {
  const { memberUuid } = req.params;

  try {
    const member = await Member.findOne({ uuid: memberUuid });
    if (!member) {
      throw new ApiError(404, "Member tidak ditemukan");
    }

    // Ambil semua riwayat upgrade dari ProductUpgrade model
    const upgradeHistory = await ProductUpgrade.find({
      memberId: member._id
    })
    .populate("oldProduct", "title depositAmount returnProfit termDuration")
    .populate("newProduct", "title depositAmount returnProfit termDuration")
    .populate("member", "uuid name")
    .sort({ upgradeDate: -1 });

    // Ambil upgrade yang sedang aktif
    const activeUpgrade = upgradeHistory.find(upgrade => upgrade.status === "Active");

    res.status(200).json(
      new ApiResponse(200, {
        memberUuid,
        upgradeHistory,
        activeUpgrade,
        hasActiveUpgrade: !!activeUpgrade
      }, "Riwayat upgrade berhasil diambil")
    );

  } catch (error) {
    console.error("Get upgrade history error:", error);
    throw new ApiError(500, "Gagal mengambil riwayat upgrade");
  }
});

/**
 * Get active upgrade untuk member (untuk cek kompensasi saat ini)
 */
const getActiveUpgrade = asyncHandler(async (req, res) => {
  const { memberUuid } = req.params;

  try {
    const member = await Member.findOne({ uuid: memberUuid });
    if (!member) {
      throw new ApiError(404, "Member tidak ditemukan");
    }

    const activeUpgrade = await ProductUpgrade.findOne({
      memberId: member._id,
      status: "Active"
    })
    .populate("oldProduct", "title depositAmount")
    .populate("newProduct", "title depositAmount")
    .populate("member", "uuid name");

    if (!activeUpgrade) {
      return res.status(200).json(
        new ApiResponse(200, {
          hasActiveUpgrade: false,
          activeUpgrade: null
        }, "Tidak ada upgrade aktif")
      );
    }

    res.status(200).json(
      new ApiResponse(200, {
        hasActiveUpgrade: true,
        activeUpgrade
      }, "Upgrade aktif ditemukan")
    );

  } catch (error) {
    console.error("Get active upgrade error:", error);
    throw new ApiError(500, "Gagal mengambil upgrade aktif");
  }
});

export {
  calculateUpgradeCompensation,
  executeProductUpgrade,
  getUpgradeHistory,
  getActiveUpgrade
};