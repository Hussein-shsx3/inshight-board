const User = require("../models/User.model");

/**
 * @desc    Get user favorites
 * @route   GET /api/user/favorites
 * @access  Private
 */
exports.getFavorites = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      status: "success",
      results: user.favorites.length,
      data: {
        favorites: user.favorites.sort((a, b) => b.savedAt - a.savedAt),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add article to favorites
 * @route   POST /api/user/favorites
 * @access  Private
 */
exports.addFavorite = async (req, res, next) => {
  try {
    const { articleId, title, url, source } = req.body;

    // Validate required fields
    if (!articleId || !title || !url) {
      return res.status(400).json({
        status: "error",
        message: "Missing required fields: articleId, title, and url are required",
      });
    }

    console.log("Adding favorite:", { articleId, title, url, source }); // Debug log

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    // Check if already in favorites
    const exists = user.favorites.some((fav) => fav.articleId === articleId);

    if (exists) {
      return res.status(400).json({
        status: "error",
        message: "Article already in favorites",
      });
    }

    // Add to favorites
    user.favorites.push({
      articleId,
      title,
      url,
      source: source || "Unknown",
      savedAt: new Date(),
    });

    await user.save();

    console.log("Favorite saved successfully"); // Debug log

    res.status(200).json({
      status: "success",
      message: "Article added to favorites",
      data: {
        favorites: user.favorites,
      },
    });
  } catch (error) {
    console.error("Error adding favorite:", error); // Debug log
    next(error);
  }
};

/**
 * @desc    Remove article from favorites
 * @route   DELETE /api/user/favorites/:articleId
 * @access  Private
 */
exports.removeFavorite = async (req, res, next) => {
  try {
    const { articleId } = req.params;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    // Filter out the article
    const initialLength = user.favorites.length;
    user.favorites = user.favorites.filter(
      (fav) => fav.articleId !== articleId
    );

    if (user.favorites.length === initialLength) {
      return res.status(404).json({
        status: "error",
        message: "Article not found in favorites",
      });
    }

    await user.save();

    res.status(200).json({
      status: "success",
      message: "Article removed from favorites",
      data: {
        favorites: user.favorites,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user preferences
 * @route   PUT /api/user/preferences
 * @access  Private
 */
exports.updatePreferences = async (req, res, next) => {
  try {
    const { categories, theme, language } = req.body;

    const user = await User.findById(req.user.id);

    // Update preferences
    if (categories) user.preferences.categories = categories;
    if (theme) user.preferences.theme = theme;
    if (language) user.preferences.language = language;

    await user.save();

    res.status(200).json({
      status: "success",
      message: "Preferences updated successfully",
      data: {
        preferences: user.preferences,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user profile
 * @route   GET /api/user/profile
 * @access  Private
 */
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      status: "success",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          preferences: user.preferences,
          favoritesCount: user.favorites.length,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/user/profile
 * @access  Private
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, email } = req.body;

    const user = await User.findById(req.user.id);

    if (name) user.name = name;
    if (email) user.email = email;

    await user.save();

    res.status(200).json({
      status: "success",
      message: "Profile updated successfully",
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};