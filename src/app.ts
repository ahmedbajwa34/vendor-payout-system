
import "dotenv/config";
import express from "express";
import { success } from "zod";
import pool from "./db/pool.js";
import authRoutes from "./routes/auth.routes.js"
import { errorHandler } from "./middlewear/error.middlewear.js";
import vendorRoutes from "./routes/vendor.routes.js"
import invoiceRoutes from "./routes/invoice.routes.js";




const app = express();


app.use(express.json())


app.get( "/", async (req, res)=> {

    const result = await pool.query("SELECT NOW()");


   res.json({
    success: true,
    message: "Vendor Payout API is running",
    databaseTime: result.rows[0].now
   })
})

app.use("/api/auth", authRoutes);

app.use("/api/vendors", vendorRoutes);

app.use("/api/invoices", invoiceRoutes);


app.use(errorHandler);

app.listen(3000, ()=> {
    console.log("Server running at PORT: 3000");
    
})