import cloudinary from "../config/cloudinary.js";
import User from "../models/User.js";

export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Upload image buffer to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { folder: "aicoo/avatars", resource_type: "image" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        )
        .end(req.file.buffer);
    });

    // Update user avatar in DB
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { avatarUrl: uploadResult.secure_url },
      { new: true }
    ).select("-password");

    res.status(200).json({
      message: "Avatar uploaded successfully",
      avatarUrl: uploadResult.secure_url,
      user,
    });
  } catch (error) {
    console.error("❌ uploadAvatar Error:", error);
    res.status(500).json({ message: "Failed to upload avatar", error: error.message });
  }
};
