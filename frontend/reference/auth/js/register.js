// Quản lý đăng ký tài khoản HL_RCS
const registerForm = document.querySelector("#registerForm");
const fullNameInput = document.querySelector("#fullName");
const registerIdentifierInput = document.querySelector("#registerIdentifier");
const registerPasswordInput = document.querySelector("#registerPassword");
const confirmPasswordInput = document.querySelector("#confirmPassword");
const agreeTermsCheckbox = document.querySelector("#agreeTerms");

const submitRegisterBtn = document.querySelector("#submitRegisterBtn");
const registerMessageBox = document.querySelector("#registerMessageBox");
const registerMessageText = document.querySelector("#registerMessage");
const registerAlertIcon = document.querySelector("#registerAlertIcon");
const registerCloseAlertBtn = document.querySelector("#registerCloseAlert");
const toggleRegisterPasswordBtn = document.querySelector("#toggleRegisterPassword");

// Icon SVG mẫu cho Alert Banner
const regIcons = {
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
  `
};

// Hiển thị / xóa lỗi cho từng trường đăng ký
const setRegError = (field, text = "") => {
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

// Hiển thị Banner phản hồi đăng ký
const showRegAlert = (text, type = "info") => {
  if (!registerMessageBox) return;
  if (!text) {
    registerMessageBox.className = "alert-box";
    if (registerMessageText) registerMessageText.textContent = "";
    return;
  }

  registerMessageBox.className = `alert-box show ${type}`;
  if (registerMessageText) registerMessageText.textContent = text;
  if (registerAlertIcon) registerAlertIcon.innerHTML = regIcons[type] || "";
};

if (registerCloseAlertBtn && registerMessageBox) {
  registerCloseAlertBtn.addEventListener("click", () => {
    registerMessageBox.className = "alert-box";
  });
}

// Kiểm tra định dạng Email hoặc Số điện thoại
const validateRegIdentifier = (value) => {
  const normalized = value.trim();
  const looksLikePhone = /^(0|\+84)[0-9]{9,10}$/.test(normalized);
  const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
  return looksLikePhone || looksLikeEmail;
};

// Tự động xóa lỗi khi người dùng gõ
[fullNameInput, registerIdentifierInput, registerPasswordInput, confirmPasswordInput].forEach(input => {
  if (input) {
    input.addEventListener("input", () => {
      setRegError(input.id);
    });
  }
});

if (agreeTermsCheckbox) {
  agreeTermsCheckbox.addEventListener("change", () => {
    setRegError("agreeTerms");
  });
}

// Ẩn / Hiện mật khẩu đăng ký
if (toggleRegisterPasswordBtn && registerPasswordInput) {
  toggleRegisterPasswordBtn.addEventListener("click", () => {
    const isPassword = registerPasswordInput.type === "password";
    registerPasswordInput.type = isPassword ? "text" : "password";

    const eyeOpen = toggleRegisterPasswordBtn.querySelector(".eye-open");
    const eyeClosed = toggleRegisterPasswordBtn.querySelector(".eye-closed");

    if (isPassword) {
      if (eyeOpen) eyeOpen.style.display = "none";
      if (eyeClosed) eyeClosed.style.display = "block";
      toggleRegisterPasswordBtn.setAttribute("aria-label", "Ẩn mật khẩu");
      toggleRegisterPasswordBtn.setAttribute("title", "Ẩn mật khẩu");
    } else {
      if (eyeOpen) eyeOpen.style.display = "block";
      if (eyeClosed) eyeClosed.style.display = "none";
      toggleRegisterPasswordBtn.setAttribute("aria-label", "Hiện mật khẩu");
      toggleRegisterPasswordBtn.setAttribute("title", "Hiện mật khẩu");
    }
  });
}

// Xử lý gửi Form Đăng ký
if (registerForm) {
  registerForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const fullName = fullNameInput ? fullNameInput.value.trim() : "";
    const identifier = registerIdentifierInput ? registerIdentifierInput.value.trim() : "";
    const password = registerPasswordInput ? registerPasswordInput.value : "";
    const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : "";
    const agreeTerms = agreeTermsCheckbox ? agreeTermsCheckbox.checked : false;

    let isValid = true;

    setRegError("fullName");
    setRegError("registerIdentifier");
    setRegError("registerPassword");
    setRegError("confirmPassword");
    setRegError("agreeTerms");
    showRegAlert("");

    // Kiểm tra họ và tên
    if (!fullName) {
      setRegError("fullName", "Vui lòng nhập họ và tên của bạn.");
      isValid = false;
    } else if (fullName.length < 2) {
      setRegError("fullName", "Họ và tên cần có ít nhất 2 ký tự.");
      isValid = false;
    }

    // Kiểm tra email hoặc số điện thoại
    if (!identifier) {
      setRegError("registerIdentifier", "Vui lòng nhập email hoặc số điện thoại.");
      isValid = false;
    } else if (!validateRegIdentifier(identifier)) {
      setRegError("registerIdentifier", "Email hoặc số điện thoại chưa đúng định dạng.");
      isValid = false;
    }

    // Kiểm tra mật khẩu
    if (!password) {
      setRegError("registerPassword", "Vui lòng nhập mật khẩu.");
      isValid = false;
    } else if (password.length < 8) {
      setRegError("registerPassword", "Mật khẩu bảo mật phải có tối thiểu 8 ký tự.");
      isValid = false;
    }

    // Kiểm tra xác nhận mật khẩu
    if (!confirmPassword) {
      setRegError("confirmPassword", "Vui lòng nhập lại mật khẩu để xác nhận.");
      isValid = false;
    } else if (password !== confirmPassword) {
      setRegError("confirmPassword", "Mật khẩu xác nhận không trùng khớp.");
      isValid = false;
    }

    // Kiểm tra điều khoản
    if (!agreeTerms) {
      setRegError("agreeTerms", "Bạn cần đồng ý với Điều khoản dịch vụ và Chính sách bảo mật để tiếp tục.");
      isValid = false;
    }

    if (!isValid) {
      showRegAlert("Vui lòng hoàn thiện đúng các trường thông tin phía trên.", "danger");
      return;
    }

    // Bật trạng thái loading trên nút đăng ký
    if (submitRegisterBtn) {
      submitRegisterBtn.classList.add("is-loading");
      const btnText = submitRegisterBtn.querySelector(".btn-text");
      if (btnText) btnText.textContent = "Đang tạo tài khoản...";
    }

    setTimeout(() => {
      if (submitRegisterBtn) {
        submitRegisterBtn.classList.remove("is-loading");
        const btnText = submitRegisterBtn.querySelector(".btn-text");
        if (btnText) btnText.textContent = "Đăng ký tài khoản";
      }

      // Thông báo đăng ký thành công
      showRegAlert(
        `Đăng ký thành công! Chào mừng ${fullName} gia nhập HL_RCS. Đang chuyển hướng về trang đăng nhập...`,
        "success"
      );

      // Lưu tài khoản mới vào danh sách tài khoản hệ thống (localStorage)
      try {
        const stored = localStorage.getItem("hlrcs_accounts");
        let accountsList = [];
        if (stored) {
          try { accountsList = JSON.parse(stored); } catch(e) {}
        }
        const newAccount = {
          identifiers: [identifier],
          password: password,
          name: fullName,
          role: "Người thuê (Renter)",
          workspace: "Tìm kiếm phòng trọ, Wishlist & Yêu cầu dịch vụ"
        };
        const existIdx = accountsList.findIndex(acc => acc.identifiers?.some(id => id.toLowerCase() === identifier.toLowerCase()));
        if (existIdx > -1) {
          accountsList[existIdx] = { ...accountsList[existIdx], ...newAccount };
        } else {
          accountsList.push(newAccount);
        }
        localStorage.setItem("hlrcs_accounts", JSON.stringify(accountsList));
      } catch (e) {
        console.error("Lỗi lưu tài khoản:", e);
      }

      // Điền sẵn tài khoản vừa đăng ký vào ô đăng nhập nếu có
      const loginIdentifier = document.querySelector("#identifier");
      if (loginIdentifier) {
        loginIdentifier.value = identifier;
      }

      // Tự động lật trang về Đăng nhập sau 1.2 giây
      setTimeout(() => {
        const authFlipBox = document.querySelector("#authFlipBox");
        if (authFlipBox) {
          authFlipBox.classList.remove("is-flipped");
          window.history.pushState({ page: "login" }, "", "login.html");
          document.title = "HL_RCS | Đăng nhập hệ thống kết nối phòng trọ";
        } else {
          window.location.href = "login.html";
        }
      }, 1200);
    }, 500);
  });
}
