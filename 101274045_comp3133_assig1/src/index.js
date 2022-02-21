
import { ApolloServer,gql } from 'apollo-server-express';
import { ApolloServerPluginDrainHttpServer } from 'apollo-server-core';
import express from 'express';
import http from 'http';
import mongoose from 'mongoose';

//Model
let user_name ="None"
let pwd ="None"
let user_type ="None"
const userSchema = new mongoose.Schema({ 
    username: {type:String, unique:true,required:true},
    firstname: {type:String,required:true},
    lastname: {type:String,required:true},
    password: {type:String,required:true,minlength:6,validate: {
        validator: function(v) {
          return /[A-Za-z]/.test(v);
        },
        message: props => `${props.value} is not a valid passwword!`
      },},
    email: {type:String,required:true,validate:{
        validator: function(v) {
            return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: "Please enter a valid email"
    }},
    type: {type:String,enum:{values:['admin','customer'],message:'{VALUE} is not supported'}}
});
const User = mongoose.model('User',userSchema);
const listingSchema = new mongoose.Schema({ 
    listing_id: {type:String, unique:true,required:true},
    listing_title: {type:String,required:true},
    description: {type:String,required:true},
    street: {type:String,required:true,},
    city: {type:String,required:true,},
    postal_code: {type:String,required:true,},
    price: {type:Number,required:true,},
    email: {type:String,required:true,validate: {
        validator: function(v) {
            return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: "Please enter a valid email"
      }},
    username: {type:String, required:true},
});
const Listing = mongoose.model('Listing',listingSchema);
const bookingSchema = new mongoose.Schema({ 
    listing_id: {type:String, required:true},
    booking_id: {type:String,required:true},
    booking_date: {type:String,required:true},
    booking_start: {type:String,required:true},
    booking_end: {type:String,required:true},
    username: {type:String,required:true},
});
const Booking = mongoose.model('Booking',bookingSchema);

const typeDefs =gql`
type Query{
    users:[User!]!
    login(username: String!,password: String!):User!
    searchListing(name:String!,city:String!):Listing!
    listingByAdmin:[Listing!]!
    listUserBookings:[Booking!]!
    listAdminBookings:[Booking!]!
}
type Cat{
    id:ID!
    name:String!
}
type User{
    username: String!
    firstname:String!
    lastname:String!
    password:String!
    email:String!
    type:String!
}
type Listing{
    listing_id: String!
    listing_title:String!
    description:String!
    street:String!
    city:String!
    postal_code:String!
    price:Float!
    email:String!
    username:String!
}
type Booking{
    listing_id: String!
    booking_id:String!
    booking_date:String!
    booking_start:String!
    booking_end:String!
    username:String!
}

type Mutation{
    createUser(username: String!,firstname:String!,lastname:String!,password:String!,email:String!,type:String!):User!
    createListing(listing_id: String!,listing_title:String!,description:String!,street:String!,city:String!,postal_code:String!,price:Float!,email:String!,username:String!):Listing!
    createBooking(listing_id: String!,booking_id:String!,booking_date:String!,booking_start:String!,booking_end:String!,username:String!):Booking!
}
`;

const resolvers ={
    Query: {
        users:async()=>{
            return await User.find()
        },
        
        login:async(parent,{username,password})=>{
            console.log(username + ' ' + password)
           const usr = User.findOne({username: username,password: password},{})
           
           return usr;
        },
    searchListing:async(parent,{name,city})=>{
        const usr =Listing.findOne({username:name,city: city},{})
        console.log(usr)
        return usr
     },
     listingByAdmin:async()=>{
       
        return await Listing.aggregate([
            {$lookup:{
                from: User,
                localField:"username",
                foreignField:"username",
                as:"collectionBData"
            }},
            {$unwind:{
                path: "$collectionBData"
            }},
            {
                $match: {
                    "collectionBData.type":"admin"
                }
            }
        ]);
     },
    listUserBookings:async(parent)=>{
       
       return await Booking.aggregate([
           {$lookup:{
               from: "user",
               localField:"username",
               foreignField:"username",
               as:"collectionBData"
           }},
           {$unwind:{
               path: "$collectionBData"
           }},
           {
               $match: {
                   "collectionBData.type":"customer"
               }
           }
       ]);
    },
    listAdminBookings: async()=>{
        return await Booking.aggregate([
            {$lookup:{
                from: User,
                localField:"username",
                foreignField:"username",
                as:"collectionBData"
            }},
            {$unwind:{
                path: "$collectionBData"
            }},
            {
                $match: {
                    "collectionBData.type":"admin"
                }
            }
        ]);
    },
    },

    Mutation: {
        createUser:async(parent,{username,firstname,lastname,password,email,type})=>{
            const user = new User({ username,firstname,lastname,password,email,type });
           await  user.save();
          // console.log(user)
           return user;
        },
        createListing:async(parent,{listing_id,listing_title,description,street,city,postal_code,price,email,username})=>{
            const listing = new Listing({ listing_id,listing_title,description,street,city,postal_code,price,email,username });
           await  listing.save();
           //console.log(listing)
           return listing;
        },
        createBooking:async(parent,{listing_id,booking_id,booking_date,booking_start,booking_end,username})=>{
            const booking = new Booking({ listing_id,booking_id,booking_date,booking_start,booking_end,username});
           await  booking.save();
           //console.log(booking)
           return booking;
        },
    }
};






async function startApolloServer() {
  const app = express();

  //const httpServer = http.createServer(app);

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    //plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });

  await server.start();

  server.applyMiddleware({ app });
  await mongoose.connect('mongodb+srv://test:test12345@cluster0.mifph.mongodb.net/myFirstDatabase?retryWrites=true&w=majority');
  await new Promise(resolve => app.listen({ port: 3000 }, resolve));

  console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`);
}

startApolloServer();
