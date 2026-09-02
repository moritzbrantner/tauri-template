pub fn greeting(name: &str) -> String {
    format!("Hello, {name}! You've been greeted from Rust!")
}

#[cfg(test)]
mod tests {
    use super::greeting;

    #[test]
    fn greeting_formats_the_name() {
        assert_eq!(greeting("Ada"), "Hello, Ada! You've been greeted from Rust!");
    }
}
