import Report from './models/reportModel.js';
import mongoose from 'mongoose';

const run = async () => {
  await mongoose.connect('mongodb+srv://ayushsingh:ayush202586@ayushcluster.umvyihu.mongodb.net');
  
  const mockData = {
    '0': {
      'hemoglobin': { value: 14.5, unit: 'g/dL', reference_low: 13.5, reference_high: 17.5 },
      'rbc': { value: 4.8, unit: '10^6/µL', reference_low: 4.5, reference_high: 5.5 }
    }
  };
  
  const report = await Report.findOneAndUpdate(
    {},
    { $set: { extractedData: mockData } },
    { sort: { uploadDate: -1 }, new: true }
  );
  
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
};

run();
