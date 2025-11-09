// src/services/udemy.service.js
import fetch from "node-fetch";

/**
 * Fetch user’s enrolled courses (read-only)
 */
export const fetchUdemyCourses = async (accessToken) => {
  try {
    const url = "https://www.udemy.com/api-2.0/users/me/subscribed-courses/?page_size=20";
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json, text/plain, */*",
        "User-Agent": "AICOO/1.0",
      },
    });

    if (res.status === 403)
      throw new Error("Invalid Udemy token or unauthorized access");
    if (!res.ok) throw new Error(`Udemy fetch failed: ${res.status}`);

    const data = await res.json();
    const results = data?.results || [];

    return results.map((course) => ({
      id: course.id,
      title: course.title,
      image: course.image_480x270,
      progress: course.progress?.completion_ratio
        ? Math.round(course.progress.completion_ratio * 100)
        : course.progress_percentage || 0,
      isPublished: course.is_published,
      visibleInstructors: course.visible_instructors?.map((i) => i.display_name),
      url: `https://www.udemy.com${course.url}`,
    }));
  } catch (err) {
    console.error("❌ fetchUdemyCourses Error:", err.message);
    throw err;
  }
};

/**
 * Fetch individual course progress
 */
export const fetchUdemyCourseProgress = async (accessToken, courseId) => {
  try {
    const url = `https://www.udemy.com/api-2.0/users/me/subscribed-courses/${courseId}/progress/`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json, text/plain, */*",
        "User-Agent": "AICOO/1.0",
      },
    });

    if (!res.ok) throw new Error(`Progress fetch failed: ${res.status}`);
    const data = await res.json();
    return {
      id: courseId,
      completedLectures: data.num_completed_lectures,
      totalLectures: data.total_lectures,
      percentComplete: Math.round(data.completion_ratio * 100),
    };
  } catch (err) {
    console.error("❌ fetchUdemyCourseProgress Error:", err.message);
    throw err;
  }
};
