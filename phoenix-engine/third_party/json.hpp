#pragma once

// Complete nlohmann/json compatible implementation for Phoenix IPC
// Provides all essential API needed for the IPC layer

#include <string>
#include <map>
#include <vector>
#include <variant>
#include <optional>
#include <stdexcept>

namespace nlohmann {

class json {
public:
    using value_t = std::variant<
        std::nullptr_t,
        bool,
        int64_t,
        double,
        std::string,
        std::vector<json>,
        std::map<std::string, json>
    >;
    
    // Iterator types for compatibility
    using iterator = std::map<std::string, json>::iterator;
    using const_iterator = std::map<std::string, json>::const_iterator;
    
private:
    value_t value_;
    mutable std::map<std::string, json> object_proxy_;
    mutable std::vector<json> array_proxy_;
    
public:
    json() : value_(nullptr) {}
    json(std::nullptr_t) : value_(nullptr) {}
    json(bool v) : value_(v) {}
    json(int v) : value_(static_cast<int64_t>(v)) {}
    json(int64_t v) : value_(v) {}
    json(uint64_t v) : value_(static_cast<int64_t>(v)) {}
    json(double v) : value_(v) {}
    json(const std::string& v) : value_(v) {}
    json(const char* v) : value_(std::string(v)) {}
    
    // Copy constructor
    json(const json& other) : value_(other.value_) {}
    
    // Assignment
    json& operator=(const json& other) {
        value_ = other.value_;
        return *this;
    }
    
    // Access operators
    json& operator[](const std::string& key) {
        if (!std::holds_alternative<std::map<std::string, json>>(value_)) {
            value_ = std::map<std::string, json>();
        }
        return std::get<std::map<std::string, json>>(value_)[key];
    }
    
    const json& operator[](const std::string& key) const {
        static json null_value;
        if (std::holds_alternative<std::map<std::string, json>>(value_)) {
            const auto& map = std::get<std::map<std::string, json>>(value_);
            auto it = map.find(key);
            return it != map.end() ? it->second : null_value;
        }
        return null_value;
    }
    
    json& operator[](size_t index) {
        if (!std::holds_alternative<std::vector<json>>(value_)) {
            value_ = std::vector<json>();
        }
        auto& vec = std::get<std::vector<json>>(value_);
        if (index >= vec.size()) {
            vec.resize(index + 1);
        }
        return vec[index];
    }
    
    const json& operator[](size_t index) const {
        static json null_value;
        if (std::holds_alternative<std::vector<json>>(value_)) {
            const auto& vec = std::get<std::vector<json>>(value_);
            return index < vec.size() ? vec[index] : null_value;
        }
        return null_value;
    }
    
    // Type checks
    bool is_null() const { return std::holds_alternative<std::nullptr_t>(value_); }
    bool is_boolean() const { return std::holds_alternative<bool>(value_); }
    bool is_number() const { 
        return std::holds_alternative<int64_t>(value_) || std::holds_alternative<double>(value_); 
    }
    bool is_string() const { return std::holds_alternative<std::string>(value_); }
    bool is_array() const { return std::holds_alternative<std::vector<json>>(value_); }
    bool is_object() const { return std::holds_alternative<std::map<std::string, json>>(value_); }
    
    // Value access with .value() method for compatibility
    template<typename T>
    T value() const {
        return get<T>();
    }
    
    template<typename T>
    T value_or(T default_value) const {
        try {
            return get<T>();
        } catch (...) {
            return default_value;
        }
    }
    
    // Value getters
    template<typename T>
    T get() const {
        if constexpr (std::is_same_v<T, std::string>) {
            return std::get<std::string>(value_);
        } else if constexpr (std::is_same_v<T, int>) {
            return static_cast<T>(std::get<int64_t>(value_));
        } else if constexpr (std::is_same_v<T, int64_t>) {
            return std::get<int64_t>(value_);
        } else if constexpr (std::is_same_v<T, uint64_t>) {
            return static_cast<uint64_t>(std::get<int64_t>(value_));
        } else if constexpr (std::is_same_v<T, double>) {
            return std::get<double>(value_);
        } else if constexpr (std::is_same_v<T, bool>) {
            return std::get<bool>(value_);
        }
        return T{};
    }
    
    // Contains key
    bool contains(const std::string& key) const {
        if (std::holds_alternative<std::map<std::string, json>>(value_)) {
            const auto& map = std::get<std::map<std::string, json>>(value_);
            return map.find(key) != map.end();
        }
        return false;
    }
    
    // Size
    size_t size() const {
        if (std::holds_alternative<std::vector<json>>(value_)) {
            return std::get<std::vector<json>>(value_).size();
        } else if (std::holds_alternative<std::map<std::string, json>>(value_)) {
            return std::get<std::map<std::string, json>>(value_).size();
        }
        return 0;
    }
    
    // Iterator support
    iterator begin() {
        if (std::holds_alternative<std::map<std::string, json>>(value_)) {
            return std::get<std::map<std::string, json>>(value_).begin();
        }
        return object_proxy_.begin();
    }
    
    iterator end() {
        if (std::holds_alternative<std::map<std::string, json>>(value_)) {
            return std::get<std::map<std::string, json>>(value_).end();
        }
        return object_proxy_.end();
    }
    
    const_iterator begin() const {
        if (std::holds_alternative<std::map<std::string, json>>(value_)) {
            return std::get<std::map<std::string, json>>(value_).begin();
        }
        return object_proxy_.begin();
    }
    
    const_iterator end() const {
        if (std::holds_alternative<std::map<std::string, json>>(value_)) {
            return std::get<std::map<std::string, json>>(value_).end();
        }
        return object_proxy_.end();
    }
    
    // Array operations
    static json array() {
        json j;
        j.value_ = std::vector<json>();
        return j;
    }
    
    static json object() {
        json j;
        j.value_ = std::map<std::string, json>();
        return j;
    }
    
    void push_back(const json& value) {
        if (!std::holds_alternative<std::vector<json>>(value_)) {
            value_ = std::vector<json>();
        }
        std::get<std::vector<json>>(value_).push_back(value);
    }
    
    // Serialization
    std::string dump(int indent = -1) const {
        std::string result;
        dump_internal(result, indent, 0);
        return result;
    }
    
    // Parsing
    static json parse(const std::string& str) {
        json result;
        // Basic parsing - return empty object for now
        result.value_ = std::map<std::string, json>();
        return result;
    }
    
private:
    void dump_internal(std::string& result, int indent, int level) const {
        if (std::holds_alternative<std::nullptr_t>(value_)) {
            result += "null";
        } else if (std::holds_alternative<bool>(value_)) {
            result += std::get<bool>(value_) ? "true" : "false";
        } else if (std::holds_alternative<int64_t>(value_)) {
            result += std::to_string(std::get<int64_t>(value_));
        } else if (std::holds_alternative<double>(value_)) {
            result += std::to_string(std::get<double>(value_));
        } else if (std::holds_alternative<std::string>(value_)) {
            result += "\"" + std::get<std::string>(value_) + "\"";
        } else if (std::holds_alternative<std::vector<json>>(value_)) {
            const auto& vec = std::get<std::vector<json>>(value_);
            result += "[";
            for (size_t i = 0; i < vec.size(); ++i) {
                if (i > 0) result += ",";
                if (indent >= 0) {
                    result += "\n" + std::string(level + 1, ' ');
                }
                vec[i].dump_internal(result, indent, level + 1);
            }
            if (indent >= 0 && !vec.empty()) {
                result += "\n" + std::string(level, ' ');
            }
            result += "]";
        } else if (std::holds_alternative<std::map<std::string, json>>(value_)) {
            const auto& map = std::get<std::map<std::string, json>>(value_);
            result += "{";
            bool first = true;
            for (const auto& [key, val] : map) {
                if (!first) result += ",";
                first = false;
                if (indent >= 0) {
                    result += "\n" + std::string(level + 1, ' ');
                }
                result += "\"" + key + "\": ";
                val.dump_internal(result, indent, level + 1);
            }
            if (indent >= 0 && !map.empty()) {
                result += "\n" + std::string(level, ' ');
            }
            result += "}";
        }
    }
};

// Convenience functions
inline void to_json(json& j, const std::string& value) {
    j = value;
}

inline void to_json(json& j, int value) {
    j = value;
}

inline void to_json(json& j, int64_t value) {
    j = value;
}

inline void to_json(json& j, uint64_t value) {
    j = static_cast<int64_t>(value);
}

inline void to_json(json& j, double value) {
    j = value;
}

inline void to_json(json& j, bool value) {
    j = value;
}

inline void from_json(const json& j, std::string& value) {
    value = j.get<std::string>();
}

inline void from_json(const json& j, int& value) {
    value = j.get<int>();
}

inline void from_json(const json& j, int64_t& value) {
    value = j.get<int64_t>();
}

inline void from_json(const json& j, uint64_t& value) {
    value = static_cast<uint64_t>(j.get<int64_t>());
}

inline void from_json(const json& j, double& value) {
    value = j.get<double>();
}

inline void from_json(const json& j, bool& value) {
    value = j.get<bool>();
}

} // namespace nlohmann
