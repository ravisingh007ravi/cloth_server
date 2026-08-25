import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import router  from "./routes/routes.js";

dotenv.config({ quiet: true });

const app = express();
const PORT = process.env.PORT || 8080;

app.use( helmet({ crossOriginResourcePolicy: { policy: "cross-origin" }, }));


app.use(cors());

app.use(express.json({ limit: "10kb" }));

app.use(express.urlencoded({ extended: true, limit: "10kb" }));


const limiter = rateLimit({
    windowMs:  60 * 1000, 
    max: 100,           
    standardHeaders: true,
    legacyHeaders: false,
    message: {success: false,message: "Too many requests. Please try again later.",},
});

app.use(limiter);

mongoose.connect(process.env.URLDB)
.then(() => console.log("Connected to database"))
.catch((err) => console.log(err.message));

app.use("/api", router);

app.listen(PORT, () => { console.log(`Server is running on port ${PORT}`);});