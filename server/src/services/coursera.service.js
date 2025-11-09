// src/services/coursera.service.js
import fetch from "node-fetch";

/**
 * Fetch user’s enrolled Coursera courses (using CAUTH cookie token)
 */
export const fetchCourseraCourses = async (cauthToken) => {
  try {
    const res = await fetch(
      "https://www.coursera.org/api/onDemandEnrollments.v1?q=me&includes=course&fields=courseId,progressPercentage",
      {
        headers: {
          Cookie: `CAUTH=${cauthToken}`,
          "User-Agent": "AICOO/1.0",
          Accept: "application/json, text/plain, */*",
        },
      }
    );

    if (res.status === 403)
      throw new Error("Invalid or expired Coursera CAUTH token");
    if (!res.ok)
      throw new Error(`Coursera API fetch failed: ${res.status}`);

    const data = await res.json();
    const results = data?.elements || [];

    return results.map((item) => ({
      id: item.id,
      courseId: item.courseId,
      title: item?.links?.course || "Unknown Course",
      progress: item.progressPercentage || 0,
    }));
  } catch (err) {
    console.error("❌ fetchCourseraCourses Error:", err.message);
    throw err;
  }
};

/**
 * Fetch details for a single course
 */
export const fetchCourseraCourseDetails = async (cauthToken, courseId) => {
  try {
    const res = await fetch(
      `https://www.coursera.org/api/courses.v1/${courseId}?fields=name,slug,photoUrl,partnerIds`,
      {
        headers: {
          Cookie: `CAUTH=${cauthToken}`,
          Accept: "application/json, text/plain, */*",
          "User-Agent": "AICOO/1.0",
        },
      }
    );

    if (!res.ok) throw new Error("Failed to fetch course details");
    const data = await res.json();
    return data?.elements?.[0] || {};
  } catch (err) {
    console.error("❌ fetchCourseraCourseDetails Error:", err.message);
    throw err;
  }
};
