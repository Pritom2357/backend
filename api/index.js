dotenv.config();
import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto'; 
import axios from 'axios';
import { pipeline } from 'stream';
import { createGzip } from 'zlib';
import { log, timeStamp } from 'console';

console.log('AppLovin API Key:', process.env.VITE_APPLOVIN_API_KEY);
console.log('Mintegral API Key:', process.env.VITE_MINTEGRAL_API_KEY);
console.log('Mintegral Secret:', process.env.VITE_MINTEGRAL_SECRET);

if (process.env.NODE_ENV !== 'production') {
    dotenv.config();
}

function getFormattedDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

const currentDate = new Date();
// currentDate.setDate(currentDate.getDate());

const date7DaysAgo = new Date(currentDate);
date7DaysAgo.setDate(currentDate.getDate() - 7);

const date60DaysAgo = new Date(currentDate);
date60DaysAgo.setDate(currentDate.getDate() - 59);

const currentFormatted = getFormattedDate(currentDate);
const date7DaysAgoFormatted = getFormattedDate(date7DaysAgo);
const date60DaysAgoFormatted = getFormattedDate(date60DaysAgo);

console.log('Current Date:', currentFormatted);
console.log('7 Days Ago:', date7DaysAgoFormatted);
console.log('60 Days Ago:', date60DaysAgoFormatted);

const applovinApiKey = process.env.VITE_APPLOVIN_API_KEY;
const mintegralApiKey = process.env.VITE_MINTEGRAL_API_KEY;
const mintegralSecret = process.env.VITE_MINTEGRAL_SECRET;
const mintegralAccessKey = process.env.VITE_MINTEGRAL_ACCESS_KEY;
const mintegralSpendApiKey = process.env.VITE_MINTEGRAL_SPEND_API_KEY;

console.log("Applovin: ", applovinApiKey);
console.log("Mintegral: ", mintegralApiKey);
console.log("Mintegral Access Key: ", mintegralAccessKey);


if(!applovinApiKey || !mintegralApiKey){
    console.error("API key not found in environment variables.");
    process.exit(1);    
}

const app = express();
const PORT = process.env.PORT || 5000;

const allowOrigins = ['http://localhost:5173', 'https://data2-git-main-pritom-biswas-projects.vercel.app', 'https://data2-pritom-biswas-projects.vercel.app/', 'https://projects-b5xj.vercel.app', 'https://projects-chi-one.vercel.app', 'https://backend-five-kohl-26.vercel.app'];

app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  }));
  

app.get('/', (req, res) => {
    res.send('Hello from the backend!');
})

// index.js

// Token generation function
const generateToken = (apiKey, timestamp) => {
    const timeHash = crypto.createHash('md5').update(timestamp.toString()).digest('hex');
    return crypto.createHash('md5').update(apiKey + timeHash).digest('hex');
  };
  
  app.get('/api/mintegral/spend', async (req, res) => {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const spendToken = generateToken(mintegralSpendApiKey, timestamp);

      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);

      const startDate = sevenDaysAgo.toISOString().split('T')[0].replace(/-/g, '');
      const endDate = today.toISOString().split('T')[0].replace(/-/g, '');

      await axios.get(`https://ss-api.mintegral.com/api/v1/reports/data`, {
        headers:{
          'access-key': mintegralAccessKey,
          'token': spendToken,
          'timestamp': timestamp.toString(),
        },
        params: {
          start_date: sevenDaysAgo,
          end_date: today,
          dimension: 'location',
        }
      })
      .then((response)=>{
          console.log(response.data);
          res.json(response.data);
      })
    } catch (error) {
        console.log(error);
    }
  });

app.get('/api/applovin', async (req, res) => {
    try {
        const apiResponse = await fetch(`https://r.applovin.com/maxReport?api_key=${applovinApiKey}&start=2024-11-10&end=2024-12-31&columns=day,estimated_revenue,country,network,application&sort_day=DESC&format=json`);

        if(!apiResponse.ok){
            throw new Error(`HTTP error! status: ${apiResponse.status}`);
        }
        res.writeHead(200, {
            'Content-Type': 'application/json',});
        apiResponse.body.pipe(res);

        // const gzip = createGzip();
        // apiResponse.body.pipe(gzip).pipe(res);
        // pipeline(apiResponse.body, gzip, res, (err) => {
        //     if(err){
        //         console.error('Error piping data:', err);
        //         res.status(500).json({ error: 'Error piping data' });                
        //     }
        // });
    } catch (error) {
        console.error('Error fetching data from API:', error);
        res.status(500).json({ error: 'Error fetching data from API' });
    }
});

//mintegral

app.get('/api/mintegral', async (req, res) => {
    try {
        const currentTimestamp = Math.floor(Date.now() / 1000);
        
        const secret = process.env.VITE_MINTEGRAL_SECRET;

        const timeHash = crypto.createHash('md5').update(currentTimestamp.toString()).digest('hex');
        const signature = crypto.createHash('md5').update(secret + timeHash).digest('hex');
        const spendAPIKey = mintegralSpendApiKey //spend API key
        const token = generateToken(spendAPIKey, currentTimestamp);
        
        console.log(`${currentFormatted}, ${date60DaysAgoFormatted}`);
        
        // const apiUrl = `https://api.mintegral.com/reporting/data?skey=60429916b7c7f4729ee61a4e89591537&time=${currentTimestamp}&start=${date60DaysAgoFormatted}&end=${currentFormatted}&sign=${signature}`;

        const apiUrl2 = `https://ss-api.mintegral.com/api/v1/reports/data?start_date=${date7DaysAgoFormatted}&end_date=${currentFormatted}&utc=+6&dimension_type=Location`;


        const headers = {
            'access-key': mintegralAccessKey,
            'token': token,
            'timestamp': currentTimestamp.toString(),
          };
        
        const apiResponse = await fetch(apiUrl2, {method: 'GET', headers});

        if (!apiResponse.ok) {
            throw new Error(`Error: Received status code ${apiResponse.status}`);
        }

        const body = await apiResponse.text(); 
        console.log('API Response Body:', body); 
        
        const data = JSON.parse(body); 
        // res.json(data);
        res.send(data);
    } catch (error) {
        console.error('Error fetching data from Mintegral API:', error);
        res.status(500).json({ error: 'Error fetching data from Mintegral API' });
    }
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}/api/mintegral`);
});
