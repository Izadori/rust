use clap::Parser;
use std::error::Error;
use std::fs::File;
use std::io::{self, BufRead, BufReader};

#[derive(Parser, Debug)]
struct Args {
    #[arg(default_value = "-")]
    filename: String,

    #[arg(
        short = 'e',
        conflicts_with = "collapse_spaces_to_tabs",
        num_args = 0..=1
    )]
    expand_tabs_to_spaces: Option<Option<u8>>,

    #[arg(
        short = 'c',
        conflicts_with = "expand_tabs_to_spaces",
        num_args = 0..=1
    )]
    collapse_spaces_to_tabs: Option<Option<u8>>,
}

enum Mode {
    ExpandTabsToSpaces,
    CollapseSpacesToTabs,
}

fn main() -> Result<(), Box<dyn Error>> {
    let args = Args::parse();
    let mode: Mode;
    let count: u8;

    if let Some(_expand_tabs_to_spaces) = args.expand_tabs_to_spaces {
        mode = Mode::ExpandTabsToSpaces;
        match args.expand_tabs_to_spaces {
            Some(c) => match c {
                Some(c) => count = c,
                None => count = 4,
            },
            None => count = 4,
        }
    } else if let Some(_collapse_spaces_to_tabs) = args.collapse_spaces_to_tabs {
        mode = Mode::CollapseSpacesToTabs;
        match args.collapse_spaces_to_tabs {
            Some(c) => match c {
                Some(c) => count = c,
                None => count = 4,
            },
            None => count = 4,
        }
    } else {
        mode = Mode::ExpandTabsToSpaces;
        count = 4;
    }

    match replace_tabs_or_spaces(&args.filename, mode, count) {
        Ok(_) => Ok(()),
        Err(e) => {
            eprintln!("Error: {}", e);
            std::process::exit(1);
        }
    }
}

fn get_input_reader(filename: &str) -> Result<Box<dyn BufRead>, Box<dyn Error>> {
    if filename == "-" {
        Ok(Box::new(io::stdin().lock()))
    } else {
        let file = File::open(filename)?;
        Ok(Box::new(BufReader::new(file)))
    }
}

fn replace_tabs_or_spaces(filename: &str, mode: Mode, count: u8) -> Result<(), Box<dyn Error>> {
    let mut reader = get_input_reader(filename)?;
    let mut buffer: Vec<u8> = Vec::new();

    const MAX_BUFFER_SIZE: usize = 16 * 1024 * 1024; // 16 MB

    loop {
        buffer.clear();
        let read_bytes = reader.read_until(b'\n', &mut buffer)?;

        if read_bytes == 0 {
            break;
        }

        if buffer.len() > MAX_BUFFER_SIZE {
            return Err("Input line exceeds maximum buffer size".into());
        }

        match mode {
            Mode::ExpandTabsToSpaces => {
                buffer = expand_tabs_to_spaces(&buffer, count);
            }
            Mode::CollapseSpacesToTabs => {
                buffer = collapse_spaces_to_tabs(&buffer, count);
            }
        }

        print!("{}", String::from_utf8_lossy(&buffer));
    }

    Ok(())
}

fn expand_tabs_to_spaces(line: &[u8], count: u8) -> Vec<u8> {
    let mut result: Vec<u8> = Vec::new();
    let mut replace_flag: bool = true;

    for &byte in line {
        if byte == b'\t' && replace_flag {
            for _ in 0..count {
                result.push(b' ');
            }
        } else {
            result.push(byte);
            replace_flag = false;
        }
    }
    result
}

fn collapse_spaces_to_tabs(line: &[u8], count: u8) -> Vec<u8> {
    let mut result: Vec<u8> = Vec::new();
    let mut space_count: u8 = 0;
    let mut replace_flag: bool = true;

    for &byte in line {
        if byte == b' ' && replace_flag {
            space_count += 1;
            if space_count == count {
                result.push(b'\t');
                space_count = 0;
            }
        } else {
            for _ in 0..space_count {
                result.push(b' ');
            }
            space_count = 0;
            result.push(byte);
            replace_flag = false;
        }
    }

    for _ in 0..space_count {
        result.push(b' ');
    }

    result
}
