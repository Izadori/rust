use clap::{Parser, Subcommand};
use std::fs;
use std::io::{self, Read};

/// Rust インデント変換ユーティリティ
#[derive(Parser, Debug)]
#[clap(
    author = "Nous Research / Hermes Agent",
    version = "0.1.0",
    about = "タブ文字とスペースを双方向に変換するCLIツール"
)]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,

    /// 処理対象のファイルパス。指定しない場合は標準入力 (stdin) から読み込みます。
    #[arg(global = true)]
    file_path: Option<String>,
}

#[derive(Subcommand, Debug)]
enum Commands {
    /// タブ文字(\t)を特定の半角スペースに展開する機能。
    Expand {
        /// 変換後の希望の半角スペース幅 (1-5)。必須です。
        #[arg(value_parser = parse_expand_width)]
        width: u8,
    },
    /// 連続するスペースを単一のタブ文字(\t)に折りたたむ機能。
    Collapse {
        /// 折りたたみ処理を行う際に、どの幅までの連続スペースを1つのタブとして扱うか (3または4)。必須です。
        #[arg(value_parser = parse_collapse_width)]
        width: u8,
    },
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let cli = Cli::parse();

    match (&cli.command, &cli.file_path) {
        (Some(Commands::Expand { width }), Some(path)) => process_file(path, true, *width)?,
        // ファイル指定なし・stdin展開: 幅はコマンドから取得
        (Some(Commands::Expand { width }), None) => process_stdin(true, *width)?,

        (Some(Commands::Collapse { width }), Some(path)) => process_file(path, false, *width)?,
        // ファイル指定なし・stdin折りたたみはOK（幅はコマンドから取得）
        (Some(Commands::Collapse { width }), None) => process_stdin(false, *width)?,

        (None, _) => {}
    }

    Ok(())
}

/// ファイルパスを指定して処理を実行する関数
fn process_file(
    path: &str,
    is_expanding: bool,
    width: u8,
) -> Result<(), Box<dyn std::error::Error>> {
    println!("--- 処理ファイル: {} ---", path);
    let contents = fs::read_to_string(path)?;
    process_content(&contents, is_expanding, width)?;
    Ok(())
}

/// 標準入力からデータを読み取り、ストリームとして処理する関数 (パイプライン対応)
fn process_stdin(is_expanding: bool, width: u8) -> Result<(), Box<dyn std::error::Error>> {
    let mut buffer = String::new();
    io::stdin().read_to_string(&mut buffer)?;
    process_content(&buffer, is_expanding, width)?;
    Ok(())
}

/// コアの変換ロジック。文字列全体を受け取り、処理し、標準出力に出力する。
fn process_content(
    content: &str,
    is_expanding: bool,
    width: u8,
) -> Result<(), Box<dyn std::error::Error>> {
    let mut output = Vec::new();

    if is_expanding {
        // タブからスペースへの変換 (Requirement 18-20): \t を 'width' 個の半角スペースに置換する
        let re = regex::Regex::new(r"(\t+)").unwrap();
        for line in content.lines() {
            let mut processed_line = String::with_capacity(line.len() * (width as usize + 1));
            let mut last_end = 0;

            for mat in re.find_iter(line) {
                let tab_count = mat.as_str().chars().filter(|&c| c == '\t').count();
                if tab_count > 0 {
                    let replacement = " ".repeat(tab_count * width as usize);
                    processed_line.push_str(&line[last_end..mat.start()]);
                    processed_line.push_str(&replacement);
                    last_end = mat.end();
                } else {
                    last_end = mat.end();
                }
            }

            processed_line.push_str(&line[last_end..]);
            output.push(processed_line);
        }
    } else {
        // スペースからタブへの変換 (Requirement 27-29): 行頭の連続する指定数のスペースを1つのタブ文字(\t)に置換する。
        // マルチバイト文字対応: char_indices() でバイト位置を安全に取得
        // 反復処理: 8spaces → \t\t (width=4の場合)。一度の変換で終わらせない。
        for line in content.lines() {
            let space_count = width as usize;
            let mut tabs = 0usize;

            // 行頭から 'width' 文字ずつスペースが連続している数を数える
            loop {
                if line.len() >= (tabs + 1) * space_count
                    && line
                        .chars()
                        .skip(tabs * space_count)
                        .take(space_count)
                        .all(|c| c == ' ')
                {
                    tabs += 1;
                } else {
                    break;
                }
            }

            // 数えた分のタブを付加し、残りを付加 (char_indicesで安全なバイトオフセット)
            if tabs > 0 {
                let byte_offset = line.char_indices().fold(0, |acc, (_, ch)| {
                    if acc < tabs * space_count {
                        acc + ch.len_utf8()
                    } else {
                        acc
                    }
                });
                let mut result = "\t".repeat(tabs);
                result.push_str(&line[byte_offset..]);
                output.push(result);
            } else {
                output.push(line.to_string());
            }
        }
    }

    // 結果を標準出力に出力 (Requirement 35)
    for line in output {
        println!("{}", line);
    }

    Ok(())
}

/// カスタムパーサー: タブ展開の幅チェック (1-5)
fn parse_expand_width(s: &str) -> Result<u8, String> {
    match s.parse::<u8>() {
        Ok(w) if w >= 1 && w <= 5 => Ok(w),
        _ => Err("スペース幅は 1 から 5 の整数である必要があります。".to_string()),
    }
}

/// カスタムパーサー: スペース折りたたみ幅チェック (3または4)
fn parse_collapse_width(s: &str) -> Result<u8, String> {
    match s.parse::<u8>() {
        Ok(w) if w == 3 || w == 4 => Ok(w),
        _ => Err("連続スペース幅は 3 または 4 である必要があります。".to_string()),
    }
}
