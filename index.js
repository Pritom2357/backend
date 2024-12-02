dotenv.config();
import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto'; // For generating the MD5 hash


console.log('AppLovin API Key:', process.env.VITE_APPLOVIN_API_KEY);
console.log('Mintegral API Key:', process.env.VITE_MINTEGRAL_API_KEY);
console.log('Mintegral Secret:', process.env.VITE_MINTEGRAL_SECRET);

function getFormattedDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

const currentDate = new Date();
// currentDate.setDate(currentDate.getDate());

// Calculate 7 days behind
const date7DaysAgo = new Date(currentDate);
date7DaysAgo.setDate(currentDate.getDate() - 7);

// Calculate 60 days behind
const date60DaysAgo = new Date(currentDate);
date60DaysAgo.setDate(currentDate.getDate() - 60);

const currentFormatted = getFormattedDate(currentDate);
const date7DaysAgoFormatted = getFormattedDate(date7DaysAgo);
const date60DaysAgoFormatted = getFormattedDate(date60DaysAgo);

console.log('Current Date:', currentFormatted);
console.log('7 Days Ago:', date7DaysAgoFormatted);
console.log('60 Days Ago:', date60DaysAgoFormatted);

const applovinApiKey = process.env.VITE_APPLOVIN_API_KEY;
const mintegralApiKey = process.env.VITE_MINTEGRAL_API_KEY;

console.log("Applovin: ", applovinApiKey);
console.log("Mintegral: ", mintegralApiKey);


if(!applovinApiKey || !mintegralApiKey){
    console.error("API key not found in environment variables.");
    process.exit(1);    
}

const app = express();
const PORT = 3000;

const allowOrigins = ['http://localhost:5173', 'https://data2-git-main-pritom-biswas-projects.vercel.app', 'https://data2-pritom-biswas-projects.vercel.app/', 'https://projects-b5xj.vercel.app'];

app.use(cors({
    origin: (origin, callback)=>{
        if(!origin || allowOrigins.includes(origin)){
            callback(null, true);
        }else{
            callback(new Error('Not allowed by CORS'));
        }
    }
}));

app.get('/api/applovin', async (req, res) => {
    try {
        const apiResponse = await fetch(`https://r.applovin.com/maxReport?api_key=${applovinApiKey}&start=2024-11-10&end=2024-12-31&columns=day,application,impressions,network,package_name,country,attempts,responses,fill_rate,estimated_revenue,ecpm&sort_day=DESC&format=json`);
        const data = await apiResponse.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching data from API:', error);
        res.status(500).json({ error: 'Error fetching data from API' });
    }
});

//mintegral


app.get('/api/mintegral', async (req, res) => {
    try {
        // Get the current timestamp (in seconds)
        const currentTimestamp = Math.floor(Date.now() / 1000);
        
        // Your secret key
        const secret = process.env.VITE_MINTEGRAL_SECRET;

        // Generate the signature (md5(SECRET + md5(time)))
        const timeHash = crypto.createHash('md5').update(currentTimestamp.toString()).digest('hex');
        const signature = crypto.createHash('md5').update(secret + timeHash).digest('hex');
        
        // Prepare the API URL with the updated timestamp and signature
        console.log(`${currentFormatted}, ${date60DaysAgoFormatted}`);
        
        const apiUrl = `https://api.mintegral.com/reporting/data?skey=60429916b7c7f4729ee61a4e89591537&time=${currentTimestamp}&start=${date60DaysAgoFormatted}&end=${currentFormatted}&sign=${signature}`;
        
        // Fetch the data from Mintegral API
        const apiResponse = await fetch(apiUrl);

        if (!apiResponse.ok) {
            throw new Error(`Error: Received status code ${apiResponse.status}`);
        }

        const body = await apiResponse.text();  // Read the body as text
        console.log('API Response Body:', body); // Log the body
        
        const data = JSON.parse(body);  // Parse it manually after logging
        res.json(data);
    } catch (error) {
        console.error('Error fetching data from Mintegral API:', error);
        res.status(500).json({ error: 'Error fetching data from Mintegral API' });
    }
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}/api/mintegral`);
});
