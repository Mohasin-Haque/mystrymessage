import dbConnect from "@/lib/dbConnect";
import UserModel from "@/modal/User";
import bcrypt from "bcryptjs"

import { sendVerificationEmail } from "@/helpers/sendVerificationEmail";
import { sources } from "next/dist/compiled/webpack/webpack";

export async function POST(request: Request){
    await dbConnect()

    try{
        const {username, email, password} = await request.json()
        const existingUserVerfiedByUsername = await UserModel.findOne({
            username,
            isVerified: true
        })

        if(existingUserVerfiedByUsername){
            return Response.json({
                success: false,
                message: "Username is already taken"
            }, {status: 400})
        }

        const existingUserVerfiedByEmail = await UserModel.findOne({email})
        const verifyCode = Math.floor(100000 + Math.random() * 900000).toString()

        if(existingUserVerfiedByEmail){
            if(existingUserVerfiedByEmail.isVerified){
                return Response.json({
                    success: false,
                    message: "User already exist with this email"
                }, {status: 400})        
            }else{
                const hashedPassword = await bcrypt.hash(password, 10)
                existingUserVerfiedByEmail.password = hashedPassword;
                existingUserVerfiedByEmail.verifyCode = verifyCode;
                existingUserVerfiedByEmail.verifyCodeExpiry = new Date(Date.now() + 3600000);
                await existingUserVerfiedByEmail.save();
            }
        }else{
           const hashedPassword = await bcrypt.hash(password, 10)
           const expiryDate = new Date()
           expiryDate.setHours(expiryDate.getHours() +1)

           const newUser = new UserModel({
                username,
                email,
                password: hashedPassword,
                verifyCode,
                verifyCodeExpiry: expiryDate,
                isVerified: false,
                isAcceptingMessage: true,
                messages: []
           })

           await newUser.save()
        }

        //send verification email
        const emailResponse = await sendVerificationEmail(
            email,
            username,
            verifyCode
        )

        if(!emailResponse.success){
            return Response.json({
                success: false,
                message: "User registered successfully. Please verify your email"
            }, {status: 201})
        }

        return Response.json({
            success: true,
            message: emailResponse.message
        }, {status: 500})

    }catch(error){
        console.error('Error registering User', error)
        return Response.json(
            {
                success: false,
                message: "Error registering user"
            },
            {
                status: 500
            }
        )
    }
}