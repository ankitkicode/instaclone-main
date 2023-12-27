function calculateTimeDifference(createdAt) {
    const postDate = new Date(createdAt);
    const currentDate = new Date();

    const timeDifferenceInMilliseconds = currentDate - postDate;
    const timeDifferenceInHours = Math.floor(Math.abs(timeDifferenceInMilliseconds) / (1000 * 60 * 60));

    return timeDifferenceInHours;
  }

  module.exports = {
    calculateTimeDifference,
    
  };