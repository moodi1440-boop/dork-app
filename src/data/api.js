// ==============================================
//  API LAYER - Clean Data Operations
// ==============================================

import { sb, supabase } from "../core/supabase";
import { toAppSalon, toAppBooking, toAppCustomer } from "./transformers";

// ==============================================
//  SALONS API
// ==============================================

export async function fetchSalons(filters = {}) {
  try {
    const salons = await sb("salons", "GET");
    return salons.map(toAppSalon);
  } catch (error) {
    console.error("Error fetching salons:", error);
    throw error;
  }
}

export async function fetchSalonById(salonId) {
  try {
    const salons = await sb("salons", "GET", null, `?id=eq.${salonId}`);
    return salons.length ? toAppSalon(salons[0]) : null;
  } catch (error) {
    console.error("Error fetching salon:", error);
    throw error;
  }
}

export async function createSalon(salonData) {
  try {
    const result = await sb("salons", "POST", salonData);
    return result.length ? toAppSalon(result[0]) : null;
  } catch (error) {
    console.error("Error creating salon:", error);
    throw error;
  }
}

export async function updateSalon(salonId, updates) {
  try {
    const result = await sb("salons", "PATCH", updates, `?id=eq.${salonId}`);
    return result.length ? toAppSalon(result[0]) : null;
  } catch (error) {
    console.error("Error updating salon:", error);
    throw error;
  }
}

export async function deleteSalon(salonId) {
  try {
    await sb("salons", "DELETE", null, `?id=eq.${salonId}`);
    return true;
  } catch (error) {
    console.error("Error deleting salon:", error);
    throw error;
  }
}

// ==============================================
//  BOOKINGS API
// ==============================================

export async function fetchBookings(salonId = null) {
  try {
    const query = salonId ? `?salon_id=eq.${salonId}` : "";
    const bookings = await sb("bookings", "GET", null, query);
    return bookings.map(toAppBooking);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    throw error;
  }
}

export async function fetchBookingById(bookingId) {
  try {
    const bookings = await sb("bookings", "GET", null, `?id=eq.${bookingId}`);
    return bookings.length ? toAppBooking(bookings[0]) : null;
  } catch (error) {
    console.error("Error fetching booking:", error);
    throw error;
  }
}

export async function createBooking(bookingData) {
  try {
    const result = await sb("bookings", "POST", bookingData);
    return result.length ? toAppBooking(result[0]) : null;
  } catch (error) {
    console.error("Error creating booking:", error);
    throw error;
  }
}

export async function updateBooking(bookingId, updates) {
  try {
    const result = await sb("bookings", "PATCH", updates, `?id=eq.${bookingId}`);
    return result.length ? toAppBooking(result[0]) : null;
  } catch (error) {
    console.error("Error updating booking:", error);
    throw error;
  }
}

export async function deleteBooking(bookingId) {
  try {
    await sb("bookings", "DELETE", null, `?id=eq.${bookingId}`);
    return true;
  } catch (error) {
    console.error("Error deleting booking:", error);
    throw error;
  }
}

// ==============================================
//  CUSTOMERS API
// ==============================================

export async function fetchCustomers(filters = {}) {
  try {
    const customers = await sb("customers", "GET");
    return customers.map(toAppCustomer);
  } catch (error) {
    console.error("Error fetching customers:", error);
    throw error;
  }
}

export async function fetchCustomerById(customerId) {
  try {
    const customers = await sb("customers", "GET", null, `?id=eq.${customerId}`);
    return customers.length ? toAppCustomer(customers[0]) : null;
  } catch (error) {
    console.error("Error fetching customer:", error);
    throw error;
  }
}

export async function createCustomer(customerData) {
  try {
    const result = await sb("customers", "POST", customerData);
    return result.length ? toAppCustomer(result[0]) : null;
  } catch (error) {
    console.error("Error creating customer:", error);
    throw error;
  }
}

export async function updateCustomer(customerId, updates) {
  try {
    const result = await sb("customers", "PATCH", updates, `?id=eq.${customerId}`);
    return result.length ? toAppCustomer(result[0]) : null;
  } catch (error) {
    console.error("Error updating customer:", error);
    throw error;
  }
}

export async function deleteCustomer(customerId) {
  try {
    await sb("customers", "DELETE", null, `?id=eq.${customerId}`);
    return true;
  } catch (error) {
    console.error("Error deleting customer:", error);
    throw error;
  }
}

// ==============================================
//  REALTIME SUBSCRIPTIONS
// ==============================================

export function subscribeToSalons(callback) {
  return supabase
    .channel("salons")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "salons" },
      (payload) => {
        const transformed = {
          ...payload,
          new: payload.new ? toAppSalon(payload.new) : null,
          old: payload.old ? toAppSalon(payload.old) : null,
        };
        callback(transformed);
      }
    )
    .subscribe();
}

export function subscribeToBookings(callback) {
  return supabase
    .channel("bookings")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "bookings" },
      (payload) => {
        const transformed = {
          ...payload,
          new: payload.new ? toAppBooking(payload.new) : null,
          old: payload.old ? toAppBooking(payload.old) : null,
        };
        callback(transformed);
      }
    )
    .subscribe();
}

export function subscribeToCustomers(callback) {
  return supabase
    .channel("customers")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "customers" },
      (payload) => {
        const transformed = {
          ...payload,
          new: payload.new ? toAppCustomer(payload.new) : null,
          old: payload.old ? toAppCustomer(payload.old) : null,
        };
        callback(transformed);
      }
    )
    .subscribe();
}
