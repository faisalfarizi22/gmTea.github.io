// src/pages/api/checkins/latest.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { CheckinService } from '../../../mongodb/services';
import { validatePagination, getSafeErrorMessage } from '../../../mongodb/utils/validators';
import { formatCheckinForResponse, formatAddressForDisplay } from '../../../mongodb/utils/formatters';
import { User } from '../../../mongodb/models'; // Import model User
import { Checkin } from '../../../mongodb/models'; // Import model Checkin

// Menambahkan type assertion untuk mengatasi error
interface CheckinWithUser extends Document {
  address: string;
  user?: {
    username?: string;
  };
  // tambahkan properti lain yang diperlukan dari ICheckin disini
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Parse pagination parameters
    const { limit, skip } = validatePagination(
      req.query.page,
      req.query.limit,
      20 // Default 20 checkins per page
    );
    
    // Get latest checkins across all users
    const checkins = await CheckinService.getLatestCheckins(limit, skip);
    
    // Format checkins for response, including username if available
    const formattedCheckins = checkins.map(checkin => {
      // Type assertion atau pendekatan akses properti yang lebih aman
      const checkinWithUser = checkin as unknown as CheckinWithUser;
      
      return {
        ...formatCheckinForResponse(checkin),
        address: checkin.address,
        displayAddress: formatAddressForDisplay(checkin.address),
        // Gunakan optional chaining dan nullish coalescing untuk menangani ketiadaan properti user
        username: checkinWithUser.user?.username ?? null
      };
    });
    
    // Get total count for stats
    const totalCount = await CheckinService.getTotalCheckinCount();

    // Hitung active wallets (unique addresses dengan check-in > 0)
    const activeWallets = await User.countDocuments({ checkinCount: { $gt: 0 } });
    
    // Hitung check-in hari ini (sejak jam 7 pagi)
    const now = new Date();
    const todaySevenAM = new Date(now);
    todaySevenAM.setHours(7, 0, 0, 0);
    
    // Jika sekarang sebelum jam 7 pagi, gunakan jam 7 pagi kemarin
    if (now < todaySevenAM) {
      todaySevenAM.setDate(todaySevenAM.getDate() - 1);
    }
    
    // Hitung jumlah check-in sejak jam 7 pagi
    const todayCheckinCount = await Checkin.countDocuments({
      blockTimestamp: { $gte: todaySevenAM }
    });
    
    // Hitung jumlah pengguna unik yang melakukan check-in hari ini
    const uniqueUsersToday = await Checkin.distinct('address', {
      blockTimestamp: { $gte: todaySevenAM }
    });
    
    // Add cache control headers
    res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30');
    
    // Update response untuk include statistik tambahan
    return res.status(200).json({
      checkins: formattedCheckins,
      pagination: {
        total: totalCount,
        limit,
        skip,
        hasMore: skip + checkins.length < totalCount
      },
      stats: {
        totalCheckins: totalCount,
        activeWallets: activeWallets,
        todayCheckins: todayCheckinCount,
        todayUniqueUsers: uniqueUsersToday.length,
        todaySince: todaySevenAM.toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error in latest checkins API:', error);
    return res.status(500).json({ message: getSafeErrorMessage(error) });
  }
}