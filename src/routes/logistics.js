import { Client, GeocodingAddressComponentType, PlaceType2 } from '@googlemaps/google-maps-services-js';
import ResponseLib from '../libs/Response.lib';
import { BadRequest } from '../libs/Error.lib';
import Engineer from '../models/engineer';
const express = require('express');
const router = express.Router();
const LogisticsConfig = require('../models/config'); // Import the LogisticsConfig model
const axios = require('axios');


router.post('/engineer/cost', async (req, res, next) => {
  try {
    const { origin, destination } = req.body;

    if (!origin) return new ResponseLib(req, res).json({ status: false, message: '"origin" is required' })
    if (!destination) return new ResponseLib(req, res).json({ status: false, message: '"destination" is required' })

    const client = new Client();
    let surge = 1.0

    const responses = await client.directions({
      params: {
        key: process.env.GOOGLE_MAPS_API_KEY,
        origin: origin,
        destination: destination,
        region: 'NG',
        departure_time: new Date()
      }
    })

    // Check if routes are available
    if (!responses.data.routes || responses.data.routes.length === 0) {
      return res.status(400).json({
        status: false,
        message: 'No routes found for the given origin and destination. '
      });
    }

    let distance = 0, duration = 0, duration_in_traffic = 0;
    for (const route of responses.data.routes) {
      for (const leg of route.legs) {
        distance += leg.distance.value
        duration += leg.duration.value
        duration_in_traffic += (leg.duration_in_traffic?.value ?? leg.duration.value)
      }
    }

    const logisticsConfig = (await LogisticsConfig.findOne()).engineer; // Fetch the logistics configuration

    let minimum_price = logisticsConfig.basePrice; // Use the fetched minimum price
    let km_price = logisticsConfig.pricePerKm; // Use the fetched price per km
    let cal = (distance - logisticsConfig.baseKm) / 1000 * km_price
    let distance_fare = Math.max(cal, 0)
    let amount = minimum_price + distance_fare

    const data = {
      base_price: Math.round((minimum_price) / 100) * 100,
      amount: Math.round((amount * surge) / 100) * 100,
      distance: distance / 1000,
      distance_fare: Math.round((distance_fare) / 100) * 100,
    }

    return new ResponseLib(req, res).json({
      status: true,
      data
    })
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      message: 'An error occurred',
      details: error.message,
    });
  }
});

router.post('/delivery/cost', async (req, res, next) => {
  try {
    const { origin, kg, destination } = req.body;

    if (!origin) return new ResponseLib(req, res).json({ status: false, message: '"origin" is required' })
    if (!destination) return new ResponseLib(req, res).json({ status: false, message: '"destination" is required' })
    if (!kg) return new ResponseLib(req, res).json({ status: false, message: '"kg" is required' })

    const client = new Client();
    let surge = 1.0

    const responses = await client.directions({
      params: {
        key: process.env.GOOGLE_MAPS_API_KEY,
        origin: origin,
        destination: destination,
        region: 'NG',
        departure_time: new Date()
      }
    })

    let distance = 0, duration = 0, duration_in_traffic = 0;
    console.log('directions', responses.data)


    for (const route of responses.data.routes) {
      for (const leg of route.legs) {
        distance += leg.distance.value
        duration += leg.duration.value
        duration_in_traffic += (leg.duration_in_traffic?.value ?? leg.duration.value)
      }
    }
    const logisticsConfig = (await LogisticsConfig.findOne()).delivery; // Fetch the logistics configuration

    let minimum_price = logisticsConfig.basePrice; // Use the fetched minimum price
    let km_price = logisticsConfig.pricePerKm; // Use the fetched price per km
    let price_per_kg = logisticsConfig.pricePerKg; // Use the fetched price per kg
    let kg_price = kg * price_per_kg
    let distance_fare = Math.max(((distance - 4000) / 1000 * km_price), 0)
    let amount = minimum_price + distance_fare + kg_price

    const data = {
      // base_price: Math.round((minimum_price) / 100) * 100,
      amount: Math.round((amount * surge) / 100) * 100,
      distance: distance / 1000,
      // kg_price,
      // distance_fare: Math.round((distance_fare) / 100) * 100,
    }
    return new ResponseLib(req, res).json({
      status: true,
      data
    })
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      message: 'An error occurred',
      details: error.message,
    });
  }
});





module.exports = router;
