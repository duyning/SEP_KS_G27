// Danh sách tài khoản hệ thống mặc định (Tài khoản tự nhận diện vai trò)
const defaultAccounts = [
  {
    identifiers: ["renter@hlrcs.vn", "0912345678"],
    password: "Renter@123",
    name: "Nguyễn Minh Anh",
    role: "Người thuê (Renter)",
    workspace: "Tìm kiếm phòng trọ, Wishlist & Yêu cầu dịch vụ"
  },
  {
    identifiers: ["host@hlrcs.vn", "0987654321"],
    password: "Host@123",
    name: "Trần Gia Huy",
    role: "Chủ trọ (Room Host)",
    workspace: "Hồ sơ nhà trọ, Quản lý phòng & Xác nhận còn trống"
  },
  {
    identifiers: ["hostb@hlrcs.vn", "0911223344"],
    password: "HostB@123",
    name: "Hoàng Văn B",
    role: "Chủ trọ (Room Host)",
    workspace: "Hồ sơ nhà trọ, Quản lý phòng & Xác nhận còn trống"
  },
  {
    identifiers: ["staff@hlrcs.vn", "0933445566"],
    password: "Staff@123",
    name: "Nguyễn Văn An",
    role: "Nhân viên hỗ trợ & Kiểm duyệt (Staff)",
    badgeRole: "Chuyên viên vận hành",
    workspace: "Bảng điều khiển tác vụ, Kiểm duyệt nhà trọ & Hỗ trợ"
  },
  {
    identifiers: ["staffb@hlrcs.vn", "0944556677"],
    password: "Staff@123",
    name: "Lê Thị Thảo",
    role: "Nhân viên hỗ trợ & Kiểm duyệt (Staff)",
    badgeRole: "Chuyên viên hỗ trợ đối tác",
    workspace: "Bảng điều khiển tác vụ, Tiếp nhận yêu cầu chủ trọ"
  },
  {
    identifiers: ["admin@hlrcs.vn", "0900000000"],
    password: "Admin@123",
    name: "Ban Quản Trị HL_RCS",
    role: "Quản trị viên (Admin)",
    workspace: "Kiểm duyệt nhà trọ, Xác minh chủ sở hữu & Vận hành"
  }
];

// Hàm lấy danh sách tài khoản hệ thống (kết hợp mặc định và tài khoản đã cập nhật/đăng ký)
const getSystemAccounts = () => {
  try {
    const raw = localStorage.getItem("hlrcs_accounts");
    if (raw) {
      const stored = JSON.parse(raw);
      if (Array.isArray(stored) && stored.length > 0) {
        const merged = [...defaultAccounts];
        stored.forEach(item => {
          const idx = merged.findIndex(acc => acc.identifiers?.some(id => item.identifiers?.includes(id)));
          if (idx > -1) {
            merged[idx] = { ...merged[idx], ...item };
          } else {
            merged.push(item);
          }
        });
        return merged;
      }
    }
  } catch (e) {
    console.error("Lỗi đọc hlrcs_accounts:", e);
  }
  return defaultAccounts;
};

// DOM Elements
const form = document.querySelector("#loginForm");
const identifierInput = document.querySelector("#identifier");
const passwordInput = document.querySelector("#password");
const submitBtn = document.querySelector("#submitBtn");
const messageBox = document.querySelector("#formMessageBox");
const messageText = document.querySelector("#formMessage");
const alertIcon = document.querySelector("#alertIcon");
const closeAlertBtn = document.querySelector("#closeAlert");
const togglePasswordBtn = document.querySelector("#togglePassword");

// Icon SVG cho Alert Banner
const icons = {
  success: `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  `,
  danger: `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  `,
  info: `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="16" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  `
};

// Hiển thị / xóa lỗi cho từng trường
const setError = (field, text = "") => {
  const errorEl = document.querySelector(`[data-error-for="${field}"]`);
  const inputEl = document.querySelector(`#${field}`);
  
  if (errorEl) {
    errorEl.textContent = text;
  }
  
  if (inputEl) {
    if (text) {
      inputEl.classList.add("input-error");
    } else {
      inputEl.classList.remove("input-error");
    }
  }
};

// Hiển thị Banner phản hồi (Success / Danger / Info)
const showAlert = (text, type = "info") => {
  if (!text) {
    messageBox.className = "alert-box";
    messageText.textContent = "";
    return;
  }

  messageBox.className = `alert-box show ${type}`;
  messageText.textContent = text;
  alertIcon.innerHTML = icons[type] || icons.info;
};

// Đóng thông báo
if (closeAlertBtn) {
  closeAlertBtn.addEventListener("click", () => {
    messageBox.className = "alert-box";
  });
}

// Kiểm tra định dạng Email hoặc Số điện thoại
const validateIdentifier = (value) => {
  const normalized = value.trim();
  const looksLikePhone = /^(0|\+84)[0-9]{9,10}$/.test(normalized);
  const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
  return looksLikePhone || looksLikeEmail;
};

// Tự động xóa lỗi khi người dùng gõ
identifierInput.addEventListener("input", () => {
  setError("identifier");
});

passwordInput.addEventListener("input", () => {
  setError("password");
});

// Ẩn / Hiện mật khẩu với Icon SVG chuyển đổi
togglePasswordBtn.addEventListener("click", () => {
  const isPassword = passwordInput.type === "password";
  passwordInput.type = isPassword ? "text" : "password";

  const eyeOpen = togglePasswordBtn.querySelector(".eye-open");
  const eyeClosed = togglePasswordBtn.querySelector(".eye-closed");

  if (isPassword) {
    eyeOpen.style.display = "none";
    eyeClosed.style.display = "block";
    togglePasswordBtn.setAttribute("aria-label", "Ẩn mật khẩu");
    togglePasswordBtn.setAttribute("title", "Ẩn mật khẩu");
  } else {
    eyeOpen.style.display = "block";
    eyeClosed.style.display = "none";
    togglePasswordBtn.setAttribute("aria-label", "Hiện mật khẩu");
    togglePasswordBtn.setAttribute("title", "Hiện mật khẩu");
  }
});

// Xử lý gửi Form Đăng nhập
form.addEventListener("submit", (event) => {
  event.preventDefault();

  const identifier = identifierInput.value.trim();
  const password = passwordInput.value;
  let isValid = true;

  setError("identifier");
  setError("password");
  showAlert("");

  // Kiểm tra email hoặc số điện thoại
  if (!identifier) {
    setError("identifier", "Vui lòng nhập email hoặc số điện thoại.");
    isValid = false;
  } else if (!validateIdentifier(identifier)) {
    setError("identifier", "Email hoặc số điện thoại chưa đúng định dạng.");
    isValid = false;
  }

  // Kiểm tra mật khẩu
  if (!password) {
    setError("password", "Vui lòng nhập mật khẩu.");
    isValid = false;
  } else if (password.length < 8) {
    setError("password", "Mật khẩu bảo mật phải có tối thiểu 8 ký tự.");
    isValid = false;
  }

  if (!isValid) {
    showAlert("Vui lòng kiểm tra lại các trường thông tin phía trên.", "danger");
    return;
  }

  // Bật trạng thái loading trên nút đăng nhập
  submitBtn.classList.add("is-loading");
  submitBtn.querySelector(".btn-text").textContent = "Đang xác thực...";

  setTimeout(() => {
    // Tắt loading
    submitBtn.classList.remove("is-loading");
    submitBtn.querySelector(".btn-text").textContent = "Đăng nhập";

    // Hệ thống tự động kiểm tra và nhận diện vai trò
    const normalizedId = identifier.toLowerCase();
    const systemAccounts = getSystemAccounts();
    const account = systemAccounts.find(
      (item) => item.identifiers.some(id => id.toLowerCase() === normalizedId) && item.password === password
    );

    if (!account) {
      showAlert("Tài khoản hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.", "danger");
      return;
    }

    // Đăng nhập thành công - Tự nhận diện vai trò và điều hướng
    const urlParams = new URLSearchParams(window.location.search);
    const redirectUrl = urlParams.get("redirect");

    showAlert(
      `Đăng nhập thành công! Nhận diện tài khoản: ${account.name} • Vai trò: ${account.role}. Đang chuyển hướng...`,
      "success"
    );

    // Lưu phiên đăng nhập (đồng bộ cả hlrcs_current_user và currentUser)
    localStorage.setItem("hlrcs_current_user", JSON.stringify(account));
    localStorage.setItem("currentUser", JSON.stringify(account));

    setTimeout(() => {
      if (redirectUrl) {
        window.location.href = decodeURIComponent(redirectUrl);
      } else {
        const role = String(account.role || "").toLowerCase();
        if (role.includes("staff") || role.includes("nhân viên") || role.includes("vận hành")) {
          window.location.href = "staff-dashboard.html";
        } else if (role.includes("admin") || role.includes("quản trị")) {
          window.location.href = "admin-dashboard.html";
        } else if (role.includes("host") || role.includes("chủ")) {
          window.location.href = "host-dashboard.html";
        } else {
          window.location.href = "index.html";
        }
      }
    }, 1000);
  }, 400);
});

// =========================================================================
// QUICK DEMO LOGIN & FILL HANDLERS (HỖ TRỢ KIỂM THỬ NHANH USER & HOSTROOM)
// =========================================================================
const performQuickLogin = (identifierValue, passwordValue, defaultRedirect) => {
  if (identifierInput) identifierInput.value = identifierValue;
  if (passwordInput) passwordInput.value = passwordValue;

  setError("identifier");
  setError("password");
  showAlert("");

  if (submitBtn) {
    submitBtn.classList.add("is-loading");
    submitBtn.querySelector(".btn-text").textContent = "Đang xác thực...";
  }

  setTimeout(() => {
    if (submitBtn) {
      submitBtn.classList.remove("is-loading");
      submitBtn.querySelector(".btn-text").textContent = "Đăng nhập";
    }

    const systemAccounts = getSystemAccounts();
    const account = systemAccounts.find(
      (item) => item.identifiers.some(id => id.toLowerCase() === identifierValue.toLowerCase()) && item.password === passwordValue
    );

    if (!account) {
      showAlert("Tài khoản mẫu không tồn tại trong hệ thống.", "danger");
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const redirectUrl = urlParams.get("redirect") || defaultRedirect;

    showAlert(
      `✓ Đăng nhập nhanh thành công! Xin chào ${account.name} (${account.role}). Đang vào hệ thống...`,
      "success"
    );

    // Lưu phiên đăng nhập vào cả 2 keys để tương thích 100% toàn bộ hệ thống
    localStorage.setItem("hlrcs_current_user", JSON.stringify(account));
    localStorage.setItem("currentUser", JSON.stringify(account));

    setTimeout(() => {
      window.location.href = redirectUrl || "index.html";
    }, 700);
  }, 350);
};

const fillLoginForm = (identifierValue, passwordValue, accountLabel) => {
  if (identifierInput) {
    identifierInput.value = identifierValue;
    identifierInput.classList.add("input-highlight");
    setTimeout(() => identifierInput.classList.remove("input-highlight"), 1200);
  }
  if (passwordInput) {
    passwordInput.value = passwordValue;
    passwordInput.classList.add("input-highlight");
    setTimeout(() => passwordInput.classList.remove("input-highlight"), 1200);
  }

  setError("identifier");
  setError("password");
  showAlert(`Đã điền thông tin: ${accountLabel} (${identifierValue}). Bạn có thể nhấn nút "Đăng nhập" để kiểm tra form.`, "info");
};

// Gắn sự kiện các nút đăng nhập mẫu
const btnQuickLoginUser = document.getElementById("btnQuickLoginUser");
const btnFillUser = document.getElementById("btnFillUser");
const btnQuickLoginHost = document.getElementById("btnQuickLoginHost");
const btnFillHost = document.getElementById("btnFillHost");
const btnQuickLoginHostB = document.getElementById("btnQuickLoginHostB");

btnQuickLoginUser?.addEventListener("click", () => {
  performQuickLogin("0912345678", "Renter@123", "index.html");
});

btnFillUser?.addEventListener("click", () => {
  fillLoginForm("0912345678", "Renter@123", "Nguyễn Minh Anh - Người thuê");
});

btnQuickLoginHost?.addEventListener("click", () => {
  performQuickLogin("0987654321", "Host@123", "host-dashboard.html");
});

btnFillHost?.addEventListener("click", () => {
  fillLoginForm("0987654321", "Host@123", "Trần Gia Huy - Chủ trọ Minh Quân");
});

btnQuickLoginHostB?.addEventListener("click", () => {
  performQuickLogin("0911223344", "HostB@123", "host-dashboard.html");
});

// Staff Demo Buttons
const btnQuickLoginStaff = document.getElementById("btnQuickLoginStaff");
const btnFillStaff = document.getElementById("btnFillStaff");
const btnQuickLoginStaffB = document.getElementById("btnQuickLoginStaffB");

btnQuickLoginStaff?.addEventListener("click", () => {
  performQuickLogin("0933445566", "Staff@123", "staff-dashboard.html");
});

btnFillStaff?.addEventListener("click", () => {
  fillLoginForm("0933445566", "Staff@123", "Nguyễn Văn An - Chuyên viên vận hành Staff");
});

btnQuickLoginStaffB?.addEventListener("click", () => {
  performQuickLogin("0944556677", "Staff@123", "staff-dashboard.html");
});
document.getElementById("btnQuickLoginAdmin")?.addEventListener("click", () => {
  performQuickLogin("0900000000", "Admin@123", "admin-dashboard.html");
});
document.getElementById("btnFillAdmin")?.addEventListener("click", () => {
  fillLoginForm("0900000000", "Admin@123", "Ban Quản Trị HL_RCS - Admin");
});

