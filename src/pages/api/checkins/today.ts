import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../mongodb/connection';
import Checkin from '../../../mongodb/models/Checkin';
import { getSafeErrorMessage } from '../../../mongodb/utils/validators';

/**
 * API endpoint untuk mendapatkan jumlah check-in hari ini (sejak 7 pagi)
 * GET /api/checkins/today
 * Query param:
 * - since: ISO timestamp untuk menentukan awal perhitungan hari (opsional, default jam 7 pagi hari ini)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();
    
    // Parse parameter 'since' (timestamp) dari query
    let sinceDate: Date;
    
    if (req.query.since && typeof req.query.since === 'string') {
      // Jika parameter 'since' disediakan, gunakan itu
      sinceDate = new Date(req.query.since);
      
      // Validasi tanggal
      if (isNaN(sinceDate.getTime())) {
        return res.status(400).json({ 
          message: 'Invalid date format for "since" parameter. Use ISO format (e.g. 2025-05-12T07:00:00.000Z)' 
        });
      }
    } else {
      // Jika tidak ada parameter 'since', gunakan jam 7 pagi hari ini
      const now = new Date();
      sinceDate = new Date(now);
      sinceDate.setHours(7, 0, 0, 0);
      
      // Jika sekarang sebelum jam 7 pagi, gunakan jam 7 pagi kemarin
      if (now < sinceDate) {
        sinceDate.setDate(sinceDate.getDate() - 1);
      }
    }
    
    // Hitung jumlah check-in sejak tanggal yang ditentukan
    const todayCheckinCount = await Checkin.countDocuments({
      blockTimestamp: { $gte: sinceDate }
    });
    
    // Hitung jumlah pengguna unik yang melakukan check-in hari ini
    const uniqueUsersToday = await Checkin.distinct('address', {
      blockTimestamp: { $gte: sinceDate }
    });
    
    // Tambahkan cache control headers
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    
    // Return hasil
    return res.status(200).json({
      count: todayCheckinCount,
      uniqueUsers: uniqueUsersToday.length,
      since: sinceDate.toISOString()
    });
    
  } catch (error) {
    console.error('Error in today\'s checkins API:', error);
    return res.status(500).json({ message: getSafeErrorMessage(error) });
  }
}