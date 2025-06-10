pub use std::collections::HashMap;

use std::env;
use std::fs::File;
use std::io::{BufReader, BufRead};

use regex::Regex;
use glob::glob;

pub struct CommandLine {
	me: String,
	params: HashMap<String, Vec<String>>,
}

impl CommandLine{
	pub fn me(&self) -> &String {
		&self.me
	}

	pub fn all(&self) -> &HashMap<String, Vec<String>> {
		&self.params
	}

	pub fn find(&self, key: &str) -> bool {
		self.params.contains_key(key)
	}

	pub fn get(&self, key: &str) -> Option<&Vec<String>> {
		match self.params.get(key) {
			None => None,
			Some(v) => Some(v)
		}
	}

	pub fn print(&self) {
		println!("me = {}", self.me);
		for (opt, params) in &self.params {
			println!("\"{}\": {:?}", opt, params);
		}
	}
}

pub fn new() -> CommandLine {
	let args: Vec<String> = env::args().collect();
	let mut args_for_parse: Vec<String> = Vec::new();
	let mut file_flag = false;

	for arg in &args {
		if arg.starts_with("-") || (cfg!(target_os = "windows") && arg.starts_with("/")) {
			if arg == "-@" || arg == "/@" || arg == "--@" {
				file_flag = true;
				args_for_parse.push("--@".to_string()); // "--@"に続くパラメータはファイルの先頭と認識する
			} else {
				file_flag = false;
				args_for_parse.push(arg.to_string());
			}
		} else if file_flag {
			append_args(&arg, &mut args_for_parse);
		} else {
			args_for_parse.push(arg.to_string());
		}
	}

	CommandLine {
		me: args[0].clone(),
		params: parse(&args_for_parse[1..args_for_parse.len()]),
	}
}

fn append_args(filename: &String, args: &mut Vec<String>) {
	if filename == "" {
		return;
	}

	match File::open(filename) {
		Ok(f) => {
			let reader = BufReader::new(f);
			let mut file_flag = false;

			for line in reader.lines() {
				let line = line.unwrap();
				let words: Vec<&str> = line.split_whitespace().collect();

				for word in &words {
					if word.starts_with("-") || (cfg!(target_os = "windows") && word.starts_with("/")) {
						if *word == "-@" || *word == "/@" || *word == "--@" {
							file_flag = true;
						} else {
							file_flag = false;
							args.push(word.to_string());
						}
					} else if !file_flag && *word != "" {
						args.push(word.to_string());
					}
				}
			}
		},
		Err(_e) => eprintln!("File not found. [{}]", filename)
	}
}

fn parse(args: &[String]) -> HashMap<String, Vec<String>> {
	let mut params: HashMap<String, Vec<String>> = HashMap::new();
	let mut last_options: Vec<String> = vec![String::new()];
	let mut key: String;
	let mut value: String;
	let re = Regex::new(r"^(?<opt>.+?)[=:](?<opt_value>.*)").unwrap();
	let re_wildcard = Regex::new(r".*[\*\?].*").unwrap();

	for arg in args {
		if arg == "--@" {
			last_options.clear();
			last_options.push("".to_string());
		}
		else if arg.starts_with("--") || (cfg!(target_os = "windows") && arg.starts_with("/")) {
			let start_index = if arg.starts_with("--") { 2 } else { 1 };
			let test_string = &arg[start_index..arg.len()];

			last_options.clear();

			if let Some(caps) = re.captures(test_string) {
				key = caps["opt"].to_string();
				value = caps["opt_value"].to_string();
				params.entry(key)
					.and_modify(|v| {
						v.push(value.clone());
					}).or_insert(vec![value.clone()]);
				last_options.push("".to_string());
			} else {
				init_param(arg[start_index..arg.len()].to_string(), &mut last_options, &mut params);
			}
		} else if arg.starts_with("-") {
			last_options.clear();

			for c in arg[1..arg.len()].chars() {
				init_param(c.to_string(), &mut last_options, &mut params);
			}
		} else {
			let mut opt_values: Vec<String> = Vec::new();

			// ワイルドカードを含む場合は、対応するファイルにすべてを追加
			// マッチしない場合、引用符付きの場合はそのまま追加
			if let Some(_caps) = re_wildcard.captures(&arg[..]) {
				let entries = glob(&arg[..]).unwrap();
				for entry in entries {
					match entry {
						Ok(path) => opt_values.push(path.display().to_string()),
						Err(_e) => opt_values.push(arg.clone())
					}
				}

				if opt_values.len() == 0 {
					opt_values.push(arg.clone());
				}
			} else {
				opt_values.push(arg.clone());
			}

			for opt in &last_options {
				for opt_value in &opt_values {
					params.entry(opt.to_string())
						.and_modify(|v| {
							v.push(opt_value.clone());
						}).or_insert(vec![opt_value.clone()]);
				}
			}
		}
	}

	params
}

fn init_param(key: String, last_options: &mut Vec<String>, params: &mut HashMap<String, Vec<String>>) {
	last_options.push(key.clone());
	params.entry(key).or_insert(Vec::new());
}
