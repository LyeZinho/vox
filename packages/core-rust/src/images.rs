use napi::bindgen_prelude::*;
use viuer::{print_from_file, Config};
use std::path::Path;

#[napi]
pub fn render_image(path: String, x: u16, y: u16, width: u16, height: u16) -> Result<()> {
    let path = Path::new(&path);
    if !path.exists() {
        return Err(Error::new(Status::GenericFailure, "Image file not found"));
    }

    let conf = Config {
        transparent: true,
        absolute_offset: true,
        x,
        y: y as i16,
        width: Some(width as u32),
        height: Some(height as u32),
        ..Default::default()
    };

    print_from_file(path, &conf).map_err(|e| {
        Error::new(
            Status::GenericFailure,
            format!("Failed to render image: {}", e),
        )
    })?;

    Ok(())
}

#[napi]
pub fn is_kitty_supported() -> bool {
    std::env::var("TERM").map(|t| t.contains("kitty") || t.contains("iterm")).unwrap_or(false)
}
