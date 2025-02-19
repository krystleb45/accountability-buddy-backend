import type { Request, Response, NextFunction } from "express";
import Tracker from "../models/Tracker"; // Database model for tracker
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import sanitize from "mongo-sanitize"; // Input sanitization

/**
 * @desc Fetch all trackers
 * @route GET /api/trackers
 * @access Private
 */
export const getAllTrackers = catchAsync(
  async (
    req: Request<{}, {}, {}, {}>,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      sendResponse(res, 401, false, "User not authenticated");
      return;
    }

    const trackers = await Tracker.find({ user: userId }).sort({ createdAt: -1 });

    sendResponse(res, 200, true, "Trackers fetched successfully", trackers);
  },
);

/**
 * @desc Create a new tracker
 * @route POST /api/trackers
 * @access Private
 */
export const createTracker = catchAsync(
  async (
    req: Request<{}, {}, { name: string }>,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;
    const { name } = req.body;

    if (!userId) {
      sendResponse(res, 401, false, "User not authenticated");
      return;
    }

    if (!name) {
      sendResponse(res, 400, false, "Tracker name is required");
      return;
    }

    const newTracker = await Tracker.create({ user: userId, name, progress: 0 });

    sendResponse(res, 201, true, "Tracker created successfully", newTracker);
  },
);

/**
 * @desc Update a tracker
 * @route PUT /api/trackers/:id
 * @access Private
 */
export const updateTracker = catchAsync(
  async (
    req: Request<{ id: string }, {}, { progress: number }>,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;
    const { id } = req.params;
    const { progress } = req.body;

    if (!userId) {
      sendResponse(res, 401, false, "User not authenticated");
      return;
    }

    if (progress === undefined || typeof progress !== "number") {
      sendResponse(res, 400, false, "Progress must be a number");
      return;
    }

    const updatedTracker = await Tracker.findOneAndUpdate(
      { _id: id, user: userId },
      { progress },
      { new: true }, // Return the updated document
    );

    if (!updatedTracker) {
      sendResponse(res, 404, false, "Tracker not found");
      return;
    }

    sendResponse(res, 200, true, "Tracker updated successfully", updatedTracker);
  },
);

/**
 * @desc Delete a tracker
 * @route DELETE /api/trackers/:id
 * @access Private
 */
export const deleteTracker = catchAsync(
  async (
    req: Request<{ id: string }>,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      sendResponse(res, 401, false, "User not authenticated");
      return;
    }

    const deletedTracker = await Tracker.findOneAndDelete({ _id: id, user: userId });

    if (!deletedTracker) {
      sendResponse(res, 404, false, "Tracker not found");
      return;
    }

    sendResponse(res, 200, true, "Tracker deleted successfully");
  },
);

/**
 * @desc Get tracking data
 * @route GET /tracker
 * @access Private
 */
export const getTrackingData = catchAsync(
  async (
    req: Request<{}, {}, {}, {}>, // Explicitly define empty generics
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id; // Extract user ID from request

    // Fetch tracking data from database
    const trackerData = await Tracker.find({ user: userId });

    // Handle case where no data is found
    if (!trackerData || trackerData.length === 0) {
      sendResponse(res, 404, false, "No tracking data found.");
    } else {
      // Send successful response with data
      sendResponse(res, 200, true, "Tracking data fetched successfully.", {
        trackerData,
      });
    }

    // Always return a resolved Promise to conform to the expected return type
    return;
  },
);



/**
 * @desc Add tracking data
 * @route POST /tracker/add
 * @access Private
 */
export const addTrackingData = catchAsync(
  async (
    req: Request<{}, {}, Record<string, any>>, // Explicitly define request generics
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    // Extract user ID from the authenticated request
    const userId = req.user?.id;

    // Sanitize and validate request body
    const trackingData = sanitize(req.body);
    if (!trackingData || Object.keys(trackingData).length === 0) {
      sendResponse(res, 400, false, "Tracking data is required.");
      return;
    }

    // Assign user ID to tracking data
    trackingData.user = userId;

    // Save tracking data to the database
    const addedData = await Tracker.create(trackingData);

    // Send a success response
    sendResponse(res, 201, true, "Tracking data added successfully.", {
      data: addedData,
    });

    // Explicitly return to ensure the function conforms to Promise<void>
    return;
  },
);


/**
 * @desc Delete tracking data
 * @route DELETE /tracker/delete/:id
 * @access Private
 */
export const deleteTrackingData = catchAsync(
  async (
    req: Request<{ id: string }>,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;
    const { id } = req.params;

    const deletedData = await Tracker.findOneAndDelete({
      _id: id,
      user: userId,
    });

    if (!deletedData) {
      sendResponse(res, 404, false, "Tracking data not found.");
      return;
    }

    sendResponse(res, 200, true, "Tracking data deleted successfully.");
  },
);
